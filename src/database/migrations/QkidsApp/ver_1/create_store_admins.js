export default function create_admins_store(iDB) {
  if (!iDB.objectStoreNames.contains('admins')) {
    const store = iDB.createObjectStore('admins', {
      keyPath: 'id',
      autoIncrement: false,
    });
  }
}
