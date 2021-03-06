// Oracle Config
// 설치시 : npm 에러 날 경우 cmd창에서 git config http.sslVerify false 수행
var dbConfig = {
    user: process.env.NODE_ORACLEDB_USER || "ocr",
    password: process.env.NODE_ORACLEDB_PASSWORD || "taiho123",
    connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING || "192.168.0.251/ocrservice",
    externalAuth: process.env.NODE_ORACLEDB_EXTERNALAUTH ? true : false,
    poolMax: 30,
    poolMin: 10
};

/* MariaDB Config
var dbConfig = {
    connectionLimit: 10,
    host: '172.16.53.142',
    port: 3307,
    user: 'root',
    password: '1234',
    database: 'koreanreICR'
};
*/

module.exports = dbConfig;

