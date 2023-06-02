const grpc = require('grpc');
const protoLoader = require('@grpc/proto-loader');

const PROTO_PATH = './service_def.proto';

const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const userProto = grpc.loadPackageDefinition(packageDefinition).User;

const client = new userProto.UserService('localhost:50051', grpc.credentials.createInsecure());

function getUser(userId) {
  return new Promise((resolve, reject) => {
    client.getUser({ userId }, (error, user) => {
      if (error) {
        reject(error);
      } else {
        resolve(user);
      }
    });
  });
}

function getAllUsers() {
  return new Promise((resolve, reject) => {
    const users = [];
    const call = client.getAllUsers({});
    call.on('data', user => users.push(user));
    call.on('error', error => reject(error));
    call.on('end', () => resolve(users));
  });
}

function addUser(name, age) {
  return new Promise((resolve, reject) => {
    const user = { name, age };
    client.addUser(user, (error, response) => {
      if (error) {
        reject(error);
      } else {
        resolve(response);
      }
    });
  });
}

function updateUser(userId, name, age) {
  return new Promise((resolve, reject) => {
    const user = { userId, name, age };
    client.updateUser(user, (error, response) => {
      if (error) {
        reject(error);
      } else {
        resolve(response);
      }
    });
  });
}

function deleteUser(userId) {
  return new Promise((resolve, reject) => {
    client.deleteUser({ userId }, (error, response) => {
      if (error) {
        reject(error);
      } else {
        resolve(response);
      }
    });
  });
}

async function test() {
  try {
    const user = await getUser(1);
    console.log('getUser:', user);

    const newUser = await addUser('John Wick', 30);
    console.log('addUser:', newUser);

    const updatedUser = await updateUser(2, 'Jane Doe', 35);
    console.log('updateUser:', updatedUser);

    const result = await deleteUser(6);
    console.log('deleteUser:', result);
  } catch (error) {
    console.error(error);
  }
}

test();
