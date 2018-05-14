export default function create_teachers_store(iDB) {
  if (!iDB.objectStoreNames.contains('teachers')) {
    const store = iDB.createObjectStore('teachers', {
      keyPath: 'id',
      autoIncrement: false,
    });
  }
}
