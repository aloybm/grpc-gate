const grpc = require('grpc');
const protoLoader = require('@grpc/proto-loader');
const sql = require('mssql');

const PROTO_PATH = './service_def.proto';

const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const userProto = grpc.loadPackageDefinition(packageDefinition).accesscontrol;

const config = {
  user: 'integratif',
  password: 'G3rb4ng!',
  server: '10.199.14.47',
  database: 'GATE_DEV',
  options: {
      encrypt: true, 
      trustServerCertificate: true 
  },  
}

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool =>{
      console.log("Connected to MSSQL");
      return pool;
  })
  .catch(err => {
      console.log("Database Connection Failed! Bad Config: ", err)
  })

async function insertlog(idKartu, idGate, cek, is_valid) {
    let table;
    if (cek == 'MASUK') table = 'log_masuk';
    else table = 'log_keluar';
    const query = `INSERT INTO ${table} (id_kartu_akses, id_register_gate, is_valid) VALUES ('${idKartu}', ${idGate}, ${is_valid})`;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .query(query);
        console.log(`Aktivitas ${cek} ${is_valid} berhasil dicatat.`);
        return result;
    } catch (err) {
        console.log(`Gagal mencatat aktivitas ${cek}: ${err}`);
        throw err;
        
    }
}
  
const masuk = async (call, callback) => {
  try {
    const pool = await poolPromise;
    const idkartu = call.request.idkartu;
    const idgate = call.request.idgate;
    const result = await pool.request()
      .input('idkartu', idkartu)
      .query(`SELECT * FROM kartu_akses WHERE id_kartu_akses = '${idkartu}'`);
    const result2 = await pool.request()
      .input('idgate', idgate)
      .query(`SELECT * FROM register_gate WHERE id_register_gate = '${idgate}'`);

    if (result.recordset.length === 0 || result2.recordset.length === 0) {
      callback(null, { return: "0" });
      console.log("Invalid idgate or idkartu ");
    } else if (result.recordset[0].is_aktif == 1) {
      callback(null, { return: "1" });
      insertlog(idkartu, idgate, "MASUK", 1);
    } else if (result.recordset[0].is_aktif == 0) {
      callback(null, { return: "0" });
      insertlog(idkartu, idgate,"MASUK", 0);
    }
  } catch (err){
    const error = new Error(err.message);
    callback(error);
  }
}

const keluar = async (call, callback) => {
  try {
    const pool = await poolPromise;
    const idkartu = call.request.idkartu;
    const idgate = call.request.idgate;
    const result = await pool.request()
      .input('idkartu', idkartu)
      .query(`SELECT * FROM kartu_akses WHERE id_kartu_akses = '${idkartu}'`);
    const result2 = await pool.request()
      .input('idgate', idgate)
      .query(`SELECT * FROM register_gate WHERE id_register_gate = '${idgate}'`);

    if (result.recordset.length === 0 || result2.recordset.length === 0) {
      callback(null, { return: "0" });
      console.log("Invalid idgate or idkartu ");
    } else if (result.recordset[0].is_aktif == 1) {
      callback(null, { return: "1" });
      insertlog(idkartu, idgate, "KELUAR", 1);
    } else if (result.recordset[0].is_aktif == 0) {
      callback(null, { return: "0" });
      insertlog(idkartu, idgate, "KELUAR", 0);
    }

  } catch (err) {
    console.log(err);
    callback(err, null);
  }
};
function main() {
  const server = new grpc.Server();
  server.addService(userProto.AccessControl.service, {
    masuk,
    keluar,
  });
  server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), () => {
    console.log('Server running at http://0.0.0.0:50051');
    server.start();
  });
}

main();
