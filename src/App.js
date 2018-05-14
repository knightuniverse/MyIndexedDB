import _ from 'lodash';
import React from 'react';
import logo from './logo.svg';
import './App.css';

import dataSource from './dataSource.json';
import DBConfigs from './database/config';
import IDBMigrationScripts from './database/migrations';
import QkidsIndexedDB from './database/indexedDB';

class App extends React.Component {
  componentDidMount() {
    const initIndexedDB = new Promise(async (resolve, reject) => {
      const { name: dsn, version: dsv } = DBConfigs.connections[
        DBConfigs.default
      ];
      const connection = new QkidsIndexedDB(dsn, dsv);
      const migrationScripts = IDBMigrationScripts[dsn];

      connection
        .open(oldVersion => {
          for (let i = oldVersion + 1; i <= dsv; ++i) {
            connection.migrate(migrationScripts[`ver_${i}`]);
          }
        })
        .then(iDB => {
          const teachersQuery = connection.prepareQuery('teachers');

          teachersQuery.insert(dataSource).then(async (r) => {
            teachersQuery
              .whereIn([1390, 5520, 103513, 105205, -1000])
              .then(teachers => {
                console.log('whereIn', teachers);
                connection.close();
              });
          });
        });
    });
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Welcome to React</h1>
        </header>
        <p className="App-intro">
          To get started, edit <code>src/App.js</code> and save to reload.
        </p>
      </div>
    );
  }
}

export default App;
