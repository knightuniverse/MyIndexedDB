export default function create_teacher_store(iDB) {
  if (!iDB.objectStoreNames.contains('students')) {
    const store = iDB.createObjectStore('students', {
      keyPath: 'id',
      autoIncrement: false,
    });
  }
}
