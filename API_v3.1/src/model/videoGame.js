/**
 * Get one or more video games
 *
 * @param {pg.Pool} client the postgres client
 * @param {number=} id the id of the video game
 * @param {string=} name the name of the video game (case insensitive and partial)
 * @param {number=} page the page number
 * @param {number=} limit the limit of viddeo games per result
 *
 * @returns {Promise<pg.Result>} the result of the query
 */
module.exports.getVideoGames = async (client, id, name, page, limit) => {
    const queryConditions = [];
    const queryValues = [];

    if (id !== undefined) {
        queryConditions.push(`id = $${queryValues.length + 1}`);
        queryValues.push(id);
    }
    if (name !== undefined) {
        queryConditions.push(`LOWER(name) LIKE $${queryValues.length + 1}`);
        queryValues.push(`%${name.toLowerCase()}%`);
    }

    let query = `SELECT * FROM video_game`;
    if (queryConditions.length > 0) {
        query += ` WHERE ${queryConditions.join(" AND ")}`;
    }

    if (page !== undefined && limit !== undefined) {
        query += ` LIMIT $${queryValues.length + 1}`;
        queryValues.push(limit);
        query += ` OFFSET $${queryValues.length + 1}`;
        queryValues.push((page - 1) * limit);
    }

    return await client.query(query, queryValues);
};

/**
 * Create a video game
 *
 * @param {pg.Pool} client the postgres client
 * @param {string} name the name of the video game
 * @param {string} description the description of the video game
 *
 * @returns {Promise<pg.Result>} the result of the query
 */
module.exports.createVideoGame = async (client, name, description) => {
    return await client.query(
        `INSERT INTO video_game (name, description) VALUES ($1, $2) RETURNING id`,
        [name, description]
    );
};

/**
 * Check if a video game exists by id
 *
 * @param {pg.Pool} client the postgres client
 * @param {number} id the id of the video game
 *
 * @returns {Promise<boolean>} true if the video game exists, false otherwise
 */
module.exports.videoGameExists = async (client, id) => {
    const { rows } = await client.query(
        `SELECT id FROM video_game WHERE id = $1`,
        [id]
    );
    return rows.length === 1;
};

/**
 * Update a video game
 *
 * @param {pg.Pool} client the postgres client
 * @param {number} id the id of the video game
 * @param {object} updateValues the video game object
 * @param {string=} updateValues.name the name of the video game
 * @param {string=} updateValues.description the description of the video game
 *
 * @returns {Promise<pg.Result>} the result of the query
 *
 * @throws {Error} if no values to update
 */
module.exports.updateVideoGame = async (client, id, updateValues) => {
    const { name, description } = updateValues;
    let query = `UPDATE video_game SET `;
    let params = [];
    let index = 1;
    if (name !== undefined) {
        query += `name = $${index}, `;
        params.push(name);
        index++;
    }
    if (description !== undefined) {
        query += `description = $${index}, `;
        params.push(description);
        index++;
    }

    if (params.length === 0) {
        throw new Error("No values to update");
    }

    query = query.slice(0, -2);
    query += ` WHERE id = $${index}`;
    params.push(id);
    return await client.query(query, params);
};

/**
 * Delete a video game
 *
 * @param {pg.Pool} client the postgres client
 * @param {number} id the id of the video game
 *
 * @returns {Promise<pg.Result>} the result of the query
 */
module.exports.deleteVideoGame = async (client, id) => {
    return await client.query(`DELETE FROM video_game WHERE id = $1`, [id]);
};

/**
 * Get the number of video games
 *
 * @param {pg.Pool} client the postgres client
 *
 * @returns {Promise<pg.Result>} the result of the query
 */
module.exports.getVideoGameCount = async (client) => {
    return await client.query(`SELECT COUNT(*) AS no FROM video_game`);
};
