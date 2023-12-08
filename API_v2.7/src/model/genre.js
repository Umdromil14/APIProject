/**
 * Create a genre
 *
 * @param {pg.Pool} client the postgres client
 * @param {string} name the genre name
 * @param {string} description the genre description
 *
 * @returns {Promise<pg.Result>} the result of the query
 */
module.exports.createGenre = async (client, name, description) => {
    return await client.query(
        `INSERT INTO genre (name, description) VALUES ($1, $2) RETURNING id`,
        [name, description]
    );
};

/**
 * Get one or more genres
 *
 * @param {pg.Pool} client the postgres client
 * @param {number=} id the id of the genre
 * @param {boolean=} alphabetical `true` if the result should be ordered alphabetically, `false` otherwise
 * @param {number=} page the page number
 * @param {number=} limit the limit of the result
 *
 * @returns {Promise<pg.Result>} the result of the query
 */
module.exports.getGenres = async (client, id, alphabetical, page, limit) => {
    const queryConditions = [];
    const queryValues = [];
    let query = `SELECT * FROM genre `;
    if (id !== undefined) {
        queryConditions.push(`id = $${queryValues.length + 1}`);
        queryValues.push(id);
    }
    if (queryConditions.length > 0) {
        query += ` WHERE ${queryConditions}`;
    }
    if (alphabetical) {
        query += `ORDER BY name ASC`;
    }

    if (page !== undefined && limit !== undefined) {
        query += ` LIMIT $${queryValues.length + 1} OFFSET $${
            queryValues.length + 2
        }`;
        queryValues.push(limit);
        queryValues.push((page - 1) * limit);
    }
    
    return await client.query(query, queryValues);
};

/**
 * Update a genre
 *
 * @param {pg.Pool} client the postgres client
 * @param {number} id the id of the genre
 *
 * @returns {Promise<pg.Result>} the result of the query
 */
module.exports.updateGenre = async (client, id, updateValues) => {
    const { name: newName, description: newDescription } = updateValues;

    let query = `UPDATE genre SET `;
    let values = [];
    let index = 1;

    if (newName !== undefined) {
        query += `name = $${index}, `;
        values.push(newName);
        index++;
    }

    if (newDescription !== undefined) {
        query += `description = $${index}, `;
        values.push(newDescription);
        index++;
    }

    if (values.length === 0) {
        throw new Error("No values to update");
    }

    query = query.slice(0, -2);
    query += ` WHERE id = $${index}`;
    values.push(id);

    return await client.query(query, values);
};

/**
 * Delete a genre by its id
 *
 * @param {pg.Pool} client the postgres client
 * @param {number} id the id of the genre
 *
 * @returns {Promise<pg.Result>} the result of the query
 */
module.exports.deleteGenre = async (client, id) => {
    return await client.query(`DELETE FROM genre WHERE id = $1`, [id]);
};

/**
 * Check if a genre exists by its id
 *
 * @param {pg.Pool} client the postgres client
 * @param {number} id the id of the genre
 *
 * @returns {Promise<boolean>} `true` if the genre exists, `flase` otherwise
 */
module.exports.genreExists = async (client, id) => {
    const { rows } = await client.query(`SELECT * FROM genre WHERE id= $1`, [
        id,
    ]);
    return rows.length == 1;
};

/**
 * Get the number of genres
 *
 * @param {pg.Pool} client the postgres client
 *
 * @returns {Promise<pg.Result>} the result of the query
 */
module.exports.getGenresCount = async (client) => {
    return await client.query(`SELECT COUNT(*) AS no FROM genre`);
};
