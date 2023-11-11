/**
 * get a user from his email
 * 
 * @param {pg.Pool} client the postgres client
 * @param {String} email the email of the user
 * 
 * @returns {Promise<pg.Result>} the result of the query
 */
module.exports.getUserFromEmail = async (client, email) => {
  return await client.query(`SELECT * FROM "user" WHERE email = $1`, [
    email,
  ]);
};

/**
 * get a user from his username
 * 
 * @param {pg.Pool} client the postgres client
 * @param {String} username the username of the user
 * 
 * @returns {Promise<pg.Result>} the result of the query
 */
module.exports.getUserFromUsername = async (client, username) => {
  return await client.query(`SELECT * FROM "user" WHERE username = $1`, [
    username,
  ]);
};

/**
 * get a user from his id
 * 
 * @param {pg.Pool} client the postgres client
 * @param {Number} id the id of the user
 * 
 * @returns {Promise<pg.Result>} the result of the query
 */
module.exports.getUserFromId = async (client, id) => {
  return await client.query(`SELECT * FROM "user" WHERE id = $1`, [id]);
};

/**
 * create a user
 * 
 * @param {pg.Pool} client the postgres client
 * @param {String} username the username of the user
 * @param {String} email the email of the user
 * @param {String} password the password of the user
 * @param {String=} firstname the firstname of the user; default to `null`
 * @param {String=} lastname the lastname of the user; default to `null`
 * 
 * @returns {Promise<pg.Result>} the result of the query
 */
module.exports.postUser = async (
  client,
  username,
  email,
  password,
  firstname = null,
  lastname = null
) => {
  return await client.query(
    `INSERT INTO "user" (username, email, hashed_password ,firstname, lastname) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [username, email, password, firstname, lastname]
  );
};

/**
 * check if a user exists
 * 
 * @param {pg.Pool} client the postgres client
 * @param {Number=} id the id of the user ; if `null`, you need to provide the username or the email
 * @param {String=} username the username of the user, if `null`, you need to provide the id or the email
 * @param {String=} email the email of the user, if `null`, you need to provide the id or the username
 * 
 * @returns {Promise<Boolean>} `true` if the user exists, `false` otherwise
 */
module.exports.clientExists = async (client, id = null, username = null, email=null) => {
  let query = `SELECT count(*) AS no FROM "user" WHERE `;
  let values = [];
  let index = 1;
  if (id === null && username === null && email === null) {
    return false;
  }
  if (id !== null) {
    query += `id = $${index}, `;
    values.push(id);
    index++;
  }
  if (username !== null) {
    query += `username = $${index}, `;
    values.push(username);
    index++;
  }
  if (email !== null) {
    query += `email = $${index}, `;
    values.push(email);
    index++;
  } 
  query = query.slice(0, -2);
  const {rows} =  await client.query(query, values);
  return rows[0].no > 0;
};

/**
 * update a user
 * 
 * @param {pg.Pool} client the postgres client
 * @param {Number} userId the id of the user
 * @param {String} username the username of the user
 * @param {String} email the email of the user
 * @param {String=} firstname the firstname of the user; default to `null`
 * @param {String=} lastname the lastname of the user; default to `null`
 * @param {String=} password the password of the user; default to `null`
 * 
 * @returns {Promise<pg.Result>} the result of the query
 */
module.exports.updateUser = async (client,userId, username,email,firstname = null ,lastname = null ,password = null) => {
  let query = `UPDATE "user" SET username = $1 , email = $2 ,`;
  let values = [username,email];
  let index = 3;

  if (firstname !== null) {
    query += `firstname = $${index}, `;
    values.push(firstname);
    index++;
  }
  if (lastname !== null) {
    query += `lastname = $${index}, `;
    values.push(lastname);
    index++;
  }
  if (password !== null) {
    query += `hashed_password = $${index}, `;
    values.push(password);
    index++;
  }
  query = query.slice(0, -2);
  query += ` WHERE id = $${index}`;
  values.push(userId);
  return await client.query(query, values);
};

/**
 * delete a user
 * 
 * @param {pg.Pool} client the postgres client
 * @param {Number} userId the id of the user
 * 
 * @returns {Promise<pg.Result>} the result of the query
 */
module.exports.deleteUser = async (client, userId) => {
  return await client.query(`DELETE FROM "user" WHERE id = $1`, [userId]);
};

/**
 * get all users
 * 
 * @param {pg.Pool} client the postgres client
 * 
 * @returns {Promise<pg.Result>} the result of the query
 */
module.exports.getUsers = async (client) => {
  return await client.query(`SELECT * FROM "user"`);
};

/**
 * get all users with an admin role
 * 
 * @param {pg.Pool} client the postgres client
 * @param {Number} userId the id of the user
 * 
 * @returns {Promise<pg.Result>} the result of the query
 */
module.exports.isAdmin = async (client, userId) => {
  const { rows } = await client.query(
    `SELECT count(*) AS no FROM "user" WHERE id = $1 AND is_admin = true`,
    [userId]
  );
  return rows[0].no > 0;
}