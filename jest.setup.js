// AsyncStorage é nativo: sem este mock qualquer módulo que o importe rebenta
// no ambiente de teste.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
