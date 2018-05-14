import _ from 'lodash';
import QkidsIndexDBQuery from './Query';

/**
 *  Represents a connection between JavaScript and a Indexed DB.
 *  @class
 */
export default class QkidsIndexedDB {
  constructor(name = '', version = 1) {
    this.__iDB = null;
    this.__initializationNeeded = false;
    this.__upgradeNeeded = false;

    this.name = name;
    this.version = version;

    if (name.length === 0) {
      throw new Error('IndexedDB name could not be empty!');
    }
  }

  get upgradeNeeded() {
    return this.__upgradeNeeded;
  }

  get initializationNeeded() {
    return this.__initializationNeeded;
  }

  open(onUpgradeNeededFunc) {
    const self = this;
    const { name, version } = self;

    return new Promise((resolve, reject) => {
      const request = global.indexedDB.open(name, version);

      request.addEventListener('error', eventArgs => {
        reject(eventArgs.target.error.message);
      });

      request.addEventListener('upgradeneeded', eventArgs => {
        const trans = eventArgs.target.transaction;

        self.__iDB = eventArgs.target.result;
        self.__iDB.oldVersion = eventArgs.oldVersion;

        trans.oncomplete = function onTransactionComplete(eventArgs) {
          resolve(eventArgs.target.result);
        };

        trans.onerror = function onTransactionError(eventArgs) {
          reject(eventArgs);
        };

        onUpgradeNeededFunc && onUpgradeNeededFunc(eventArgs.oldVersion);
      });

      request.addEventListener('success', eventArgs => {
        const iDB = eventArgs.target.result;

        self.__iDB = iDB;
        self.__iDB.oldVersion = iDB.version;

        resolve(iDB);
      });
    });
  }

  close() {
    this.__iDB.close();
  }

  migrate(migrations) {
    /*
    const { name, __iDB } = this;
    const migrations = IDBMigrationScripts[name];

    if (migrations && migrations[`ver_${version}`]) {
      _.each(migrations[`ver_${version}`], migration => {
        migration(__iDB);
      });
    }
    */
    if (migrations.length === 0) {
      return Promise.resolve();
    }

    const { name, __iDB } = this;

    return new Promise((resolve, reject) => {
      _.each(migrations, migration => {
        migration(__iDB);
      });

      resolve();
    });
  }

  drop() {
    const { name } = this;

    return new Promise((resolve, reject) => {
      try {
        global.indexedDB.deleteDatabase(name);
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }

  prepareQuery(storeName, indexName) {
    const { __iDB } = this;
    return new QkidsIndexDBQuery(__iDB, storeName, indexName);
  }
}
