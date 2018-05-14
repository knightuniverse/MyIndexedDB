```javascript
import _ from 'lodash';

import Actor from './Actor';
import Mail from './Mail';

import { Teacher } from 'qkids-app/dist/actions/actionTypes';
import {
  prepareRequest,
  parseApiResponse,
} from 'qkids-app/dist/middlewares/utils';
import QkidsConsole from '../console';

import DBConfigs from '../indexedDB/config';
import QkidsIndexedDB from '../indexedDB';

function classify(orderedIds, lookupTable) {
  const local = [];
  const remote = [];

  _.each(orderedIds, id => {
    if (~~lookupTable[id] === 1) {
      local.push(id);
    } else {
      remote.push(id);
    }
  });

  return {
    local,
    remote,
  };
}

function slice(orderedIds) {
  const MAX = 50;
  const len = orderedIds.length;

  if (len === 0) {
    return [];
  }

  if (len <= MAX) {
    return [orderedIds];
  }

  const groups = [];
  const groupCount = Math.ceil(len / MAX);

  for (let i = 0; i < groupCount; i += 1) {
    const start = i * MAX;
    let end = (i + 1) * MAX;

    if (end > len) {
      end = len;
    }

    groups.push(_.slice(orderedIds, start, end));
  }

  return groups;
}

export default class TeachersActor extends Actor {
  static tag = 'TeachersActor';

  act(mail) {
    const { message } = mail;
    const { actionType } = message;

    switch (actionType) {
      case Teacher.GET_SIMPLE_LIST:
        return this.getSimpleList(mail);
      default:
        return this.acknowledge(mail);
    }
  }

  acknowledge({ from, to }) {
    const reply = new Mail(TeachersActor.tag, from, {
      actorResult: Promise.resolve(),
    });

    this.sendMail(reply);
  }

  fetchTeachersFromAPI(accessToken, uri, method, ids) {
    const groups = slice(ids);
    const fetchTasks = _.map(groups, group => {
      return global
        .fetch(prepareRequest(accessToken, uri, method, { ids: group }))
        .then(parseApiResponse);
    });

    return Promise.all(fetchTasks).then(results => {
      QkidsConsole.info('fetching teachers from remote is done, ', results);

      let teachersFromRemote = [];
      _.each(results, item => {
        teachersFromRemote = _.concat(teachersFromRemote, item.json);
      });

      QkidsConsole.info('teachers from remote are', teachersFromRemote);

      return new Promise((resolve, reject) => {
        resolve(teachersFromRemote);
      });
    });
  }

  async getSimpleList({ message }) {
    const self = this;
    const { actionType, apiParams } = message;
    const { accessToken, uri, method, body } = apiParams;
    const { ids } = body;

    const executor = async function executor(resolve, reject) {
      if (!ids || ids.length === 0) {
        resolve([]);
      } else {
        const orderedIds = ids.sort((x, y) => x - y);

        const { name: dsn, version: dsv } = DBConfigs.connections[
          DBConfigs.default
        ];
        const connection = new QkidsIndexedDB(dsn, dsv);

        await connection.open();

        const lookupQuery = connection.prepareQuery(
          'lookup',
          'idx_targetStore',
        );
        const map = await lookupQuery.find('teachers');

        let local;
        let remote;
        if (!map) {
          local = [];
          remote = orderedIds;
        } else {
          const classified = classify(orderedIds, map.lookupTable);

          local = classified.local;
          remote = classified.remote;
        }

        const originalLookupTable = !map ? {} : map.lookupTable;
        const teachersFromRemote = await self.fetchTeachersFromAPI(
          accessToken,
          uri,
          method,
          remote,
        );
        const updatingLookupTable = {};
        _.each(teachersFromRemote, item => {
          updatingLookupTable[item.id] = 1;
        });

        const updatingMap = {
          targetStore: 'teachers',
          lookupTable: _.assign({}, originalLookupTable, updatingLookupTable),
        };

        const teachersQuery = connection.prepareQuery('teachers', 'idx_id');

        let updatingIndexedDB;
        if (!map) {
          updatingIndexedDB = Promise.all([
            teachersQuery.batchInsert(teachersFromRemote),
            lookupQuery.insert(updatingMap),
          ]);
        } else {
          updatingIndexedDB = Promise.all([
            teachersQuery.batchInsert(teachersFromRemote),
            lookupQuery.update(updatingMap),
          ]);
        }

        await updatingIndexedDB;

        const teachers = await teachersQuery.whereIn(orderedIds);

        connection.close();
        resolve(teachers);
      }
    };

    const reply = new Promise(executor);
    const teachers = await reply;

    self.sendMail(
      new Mail(TeachersActor.tag, 'OutboundActor', {
        actorResult: Promise.resolve(teachers),
      }),
    );
  }

  notify(mail) {
    this.act(mail);
  }
}
```