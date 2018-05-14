import _ from 'lodash';

export default class Query {
  constructor(db, storeName, indexName) {
    this.db = db;
    this.storeName = storeName;
    this.indexName = indexName;
  }

  openTransaction(mode = 'readonly') {
    const { db, storeName, indexName } = this;
    const transaction = db.transaction(storeName, mode);
    return transaction;
  }

  insert(row) {
    return new Promise((resolve, reject) => {
      const trans = this.openTransaction('readwrite');
      const store = trans.objectStore(this.storeName);

      trans.oncomplete = function onTransactionComplete(eventArgs) {
        //  eventArgs.target is trans itself
        resolve(eventArgs.target.result);
      };

      trans.onerror = function onTransactionError(eventArgs) {
        if (eventArgs.target.error.name === 'ConstraintError') {
          eventArgs.preventDefault();
        } else {
          reject(eventArgs);
        }
      };

      trans.onabort = function onTransactionAbort(eventArgs) {
        if (eventArgs.target.error.name === 'ConstraintError') {
          eventArgs.preventDefault();
        }
      };

      if (_.isArray(row)) {
        _.each(row, item => {
          store.add(item);
        });
      } else {
        store.add(row);
      }
    });
  }

  update(row) {
    return new Promise((resolve, reject) => {
      const trans = this.openTransaction('readwrite');
      const store = trans.objectStore(this.storeName);

      trans.oncomplete = function onTransactionComplete(eventArgs) {
        resolve(eventArgs.target.result);
      };

      trans.onerror = function onTransactionError(eventArgs) {
        reject(eventArgs);
      };

      if (_.isArray(row)) {
        _.each(row, item => {
          store.put(item);
        });
      } else {
        store.put(row);
      }
    });
  }

  delete(key) {
    return new Promise((resolve, reject) => {
      const trans = this.openTransaction('readwrite');
      const store = trans.objectStore(this.storeName);

      trans.oncomplete = function onTransactionComplete(eventArgs) {
        resolve(eventArgs.target.result);
      };

      trans.onerror = function onTransactionError(eventArgs) {
        reject(eventArgs);
      };

      if (_.isArray(key)) {
        _.each(key, item => {
          store.delete(item);
        });
      } else {
        store.delete(key);
      }
    });
  }

  find(key) {
    return new Promise((resolve, reject) => {
      const trans = this.openTransaction('readonly');
      const store = trans.objectStore(this.storeName);
      const request = store.get(key);

      request.onsuccess = function onTransactionComplete(eventArgs) {
        resolve(eventArgs.target.result);
      };

      request.onerror = function onTransactionError(eventArgs) {
        reject(eventArgs);
      };
    });
  }

  whereIn(keys) {
    const trans = this.openTransaction('readonly');
    const store = trans.objectStore(this.storeName);

    return Promise.all(
      _.map(
        keys,
        key =>
          new Promise((resolve, reject) => {
            const request = store.get(key);

            request.onsuccess = function onTransactionComplete(eventArgs) {
              resolve(eventArgs.target.result);
            };

            request.onerror = function onTransactionError(eventArgs) {
              reject(eventArgs);
            };
          }),
      ),
    ).then(results => {
      const purged = [];

      _.each(results, item => {
        if (!_.isUndefined(item)) {
          purged.push(item);
        }
      });

      return Promise.resolve(purged);
    });
  }

  openCursor() {
    //  TODO
  }

  openKeyCursor() {
    //  TODO
  }
}
