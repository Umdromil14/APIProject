/**
 * @swagger
 * components:
 *  schemas:
 *      Error:
 *          type: object
 *          properties:
 *              code:
 *                  type: string
 *                  description: The error code
 *              message:
 *                  type: string
 *                  description: The error message
 */

/**
 * @swagger
 * components:
 *  schemas:
 *      User:
 *          type: object
 *          properties:
 *              id:
 *                  type: integer
 *                  description: The user id
 *              username:
 *                  type: string
 *                  description: The user username
 *              email:
 *                  type: string
 *                  description: The user email
 *              firstname:
 *                  type: string
 *                  description: The user firstname
 *              lastname:
 *                  type: string
 *                  description: The user lastname
 *              is_admin:
 *                  type: boolean
 *                  description: The user status
 */

const pool = require("../model/database");
const UserDB = require("../model/userDB.js");
const GamesDB = require("../model/game.js");
const PublicationDB = require("../model/publication.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const HTTPStatus = require("../tools/HTTPStatus.js");
const PGErrors = require("../tools/PGErrors");

const {
    loginSchema,
    userSchema,
    userWithGamesSchema,
    updateMyAccountSchema,
    updateUserSchema,
    getUserSchema,
} = require("../zod/schema/user");

const { validateObject } = require("../zod/zod");
/**
 * Login a user that already exists
 *
 * @param {Request} req
 * @param {Response} res
 *
 * @returns {Promise<void>}
 *
 * @swagger
 * components:
 *  responses:
 *      LoginSuccess:
 *          description: Token generated
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      properties:
 *                          token:
 *                              type: string
 *                              description: The user token
 *  requestBodies:
 *      Login:
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      properties:
 *                          login:
 *                              type: string
 *                              description: The user login (username or email)
 *                          password:
 *                              type: string
 *                              description: The user password
 *                      required:
 *                          - login
 *                          - password
 */
module.exports.login = async (req, res) => {
    let login, password;
    try {
        ({ login, password } = validateObject(req.body, loginSchema));
    } catch (error) {
        res.status(HTTPStatus.BAD_REQUEST).json({
            code: "INVALID_INPUT",
            message: error.message,
        });
        return;
    }
    const client = await pool.connect();
    try {
        let user;
        if (login.includes("@")) {
            user = (await UserDB.getUserFromEmail(client, login)).rows[0];
        } else {
            user = (await UserDB.getUserFromUsername(client, login)).rows[0];
        }

        if (!user) {
            res.status(HTTPStatus.UNAUTHORIZED).json({
                code: "WRONG_CREDENTIALS",
                message: "Wrong password or username/email",
            });
            return;
        }

        const { id, hashed_password: hashedPassword, is_admin: isAdmin } = user;

        if (!(await bcrypt.compare(password, hashedPassword))) {
            res.status(HTTPStatus.UNAUTHORIZED).json({
                code: "WRONG_CREDENTIALS",
                message: "Wrong password or username/email",
            });
            return;
        }

        const token = jwt.sign(
            {
                data: {
                    id,
                    isAdmin,
                },
            },
            process.env.JWT_SECRET,
            {
                expiresIn : process.env.JWT_EXPIRATION + "s"
            }
        );

        res.json({ token });
    } catch (error) {
        res.sendStatus(HTTPStatus.INTERNAL_SERVER_ERROR);
    } finally {
        client.release();
    }
};

/**
 * Create a new user
 *
 * @param {Request} req
 * @param {Response} res
 *
 * @returns {Promise<void>}
 *
 * @swagger
 * components:
 *  responses:
 *      UserAdded:
 *          description: The user was added
 *  requestBodies:
 *      UserToAdd:
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      properties:
 *                          username:
 *                              type: string
 *                              description: The user username
 *                          email:
 *                              type: string
 *                              description: The user email
 *                          firstname:
 *                              type: string
 *                              description: The user firstname
 *                          lastname:
 *                              type: string
 *                              description: The user lastname
 *                          password:
 *                              type: string
 *                              description: The user password
 *                          is_admin:
 *                              type: boolean
 *                              description: The user status
 *                      required:
 *                          - username
 *                          - email
 *                          - password
 */
module.exports.createUser = async (req, res) => {
    let username, email, firstname, lastname, password, isAdmin;
    try {
        ({
            username,
            email,
            firstname,
            lastname,
            password,
            is_admin: isAdmin,
        } = validateObject(req.body, userSchema));
    } catch (error) {
        res.status(HTTPStatus.BAD_REQUEST).json({
            code: "INVALID_INPUT",
            message: error.message,
        });
        return;
    }
    const client = await pool.connect();

    try {
        await UserDB.createUser(
            client,
            username,
            email,
            await bcrypt.hash(password, 10),
            firstname,
            lastname,
            isAdmin
        );

        res.sendStatus(HTTPStatus.CREATED);
    } catch (error) {
        switch (error.code) {
            case PGErrors.UNIQUE_VIOLATION:
                res.status(HTTPStatus.CONFLICT).json({
                    code: "DUPLICATE_ENTRY",
                    message: error.detail,
                });
                break;
            default:
                res.sendStatus(HTTPStatus.INTERNAL_SERVER_ERROR);
        }
    } finally {
        client.release();
    }
};

/**
 * Delete a user
 * @param {Request} req
 * @param {Response} res
 *
 * @returns {Promise<void>}
 *
 * @swagger
 * components:
 *  responses:
 *      UserDeleted:
 *          description: The user was deleted
 */
async function deleteUser(id, res) {
    const userId = parseInt(id);
    if (isNaN(userId)) {
        res.status(HTTPStatus.BAD_REQUEST).json({
            code: "INVALID_INPUT",
            message: "Id must be a Number",
        });
        return;
    }
    const client = await pool.connect();
    try {
        if (await UserDB.isAdmin(client, userId)) {
            res.status(HTTPStatus.FORBIDDEN).json({
                code: "DELETE_FORBIDDEN",
                message: "You can't delete an admin",
            });
            return;
        }
        await client.query("BEGIN");
        await GamesDB.deleteGamesFromUser(client, userId);
        const { rowCount } = await UserDB.deleteUser(client, userId);
        if (rowCount === 0) {
            await client.query("ROLLBACK");
            
            res.status(HTTPStatus.NOT_FOUND).json({
                code: "RESOURCE_NOT_FOUND",
                message: "No user found",
            });
            return;
        }

        await client.query("COMMIT");
        res.sendStatus(HTTPStatus.NO_CONTENT);
    } catch (error) {
        await client.query("ROLLBACK");
        res.sendStatus(HTTPStatus.INTERNAL_SERVER_ERROR);
    } finally {
        client.release();
    }
}

/**
 * Delete a user from an admin account
 *
 * @param {Request} req
 * @param {Response} res
 *
 * @returns {Promise<void>}
 */
module.exports.deleteUserFromAdmin = async (req, res) => {
    await deleteUser(req.params.userId, res);
};

/**
 * Delete the user account with his token
 *
 * @param {Request} req
 * @param {Response} res
 *
 * @returns {Promise<void>}
 *
 */
module.exports.deleteMyAccount = async (req, res) => {
    await deleteUser(req.session.id, res);
};

/**
 * Update a user
 * 
 * @param {Object} user the user to update
 * @param {number} user.id the id of the user
 * @param {string =} user.username the new username of the user
 * @param {string =} user.email the new email of the user
 * @param {string =} user.firstname the new firstname of the user
 * @param {string =} user.lastname the new lastname of the user
 * @param {string =} user.password the new password of the user
 * @param {Response} res
 *
 * @returns {Promise<void>}
 */
async function updateUser(userId, user, res) {
    userId = parseInt(userId);
    if (isNaN(userId)) {
        res.status(HTTPStatus.BAD_REQUEST).json({
            code: "INVALID_INPUT",
            message: "Id must be a Number",
        });
        return;
    }

    if (Object.keys(user).length === 0) {
        res.status(HTTPStatus.BAD_REQUEST).json({
            code: "INVALID_INPUT",
            message: "No values to update",
        });
        return;
    }

    const client = await pool.connect();
    try {
        user.password = user.password
            ? await bcrypt.hash(user.password, 10)
            : undefined;

        const { rowCount } = await UserDB.updateUser(client, userId, user);
        if (rowCount === 0) {
            res.status(HTTPStatus.NOT_FOUND).json({
                code: "RESOURCE_NOT_FOUND",
                message: "No user found",
            });
            return;
        }

        res.sendStatus(HTTPStatus.NO_CONTENT);
    } catch (error) {
        switch (error.code) {
            case PGErrors.UNIQUE_VIOLATION:
                res.status(HTTPStatus.CONFLICT).json({
                    code: "DUPLICATE_ENTRY",
                    message: error.detail,
                });
                break;
            default:
                res.sendStatus(HTTPStatus.INTERNAL_SERVER_ERROR);
        }
    } finally {
        client.release();
    }
}

/**
 * Update a user from an admin account
 *
 * @param {Request} req
 * @param {Response} res
 *
 * @returns {Promise<void>}
 *
 * @swagger
 * components:
 *  responses:
 *      UserUpdated:
 *          description: The user was updated
 *  requestBodies:
 *      UserToUpdateFromAdmin:
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      properties:
 *                          username:
 *                              type: string
 *                              description: The user username
 *                          email:
 *                              type: string
 *                              description: The user email
 *                          firstname:
 *                              type: string
 *                              description: The user firstname
 *                          lastname:
 *                              type: string
 *                              description: The user lastname
 *                          password:
 *                              type: string
 *                              description: The user password
 *                          is_admin:
 *                              type: boolean
 *                              description: The user status

 */
module.exports.updateUserFromAdmin = async (req, res) => {
    let user;
    try {
        user = validateObject(req.body, updateUserSchema);
    } catch (error) {
        res.status(HTTPStatus.BAD_REQUEST).json({
            code: "INVALID_INPUT",
            message: error.message,
        });
        return;
    }
    await updateUser(req.params.userId, user, res);
};

/**
 * Update the user account with his token
 *
 * @param {Request} req
 * @param {Response} res
 *
 * @returns {Promise<void>}
 *
 * @swagger
 * components:
 *  responses:
 *      UserAndTokenUpdated:
 *          description: The user was updated
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      properties:
 *                          token:
 *                              type: string
 *                              description: The new user token
 *  requestBodies:
 *      UserToUpdateFromToken:
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      properties:
 *                          username:
 *                              type: string
 *                              description: The user username
 *                          email:
 *                              type: string
 *                              description: The user email
 *                          firstname:
 *                              type: string
 *                              description: The user firstname
 *                          lastname:
 *                              type: string
 *                              description: The user lastname
 */
module.exports.updateMyAccount = async (req, res) => {
    let user;
    try {
        user = validateObject(req.body, updateMyAccountSchema);
    } catch (error) {
        res.status(HTTPStatus.BAD_REQUEST).json({
            code: "INVALID_INPUT",
            message: error.message,
        });
        return;
    }
    await updateUser(req.session.id, user, res);
};

/**
 * Create a user with games
 *
 * @param {Request} req
 * @param {Response} res
 *
 * @returns {Promise<void>}
 *
 * @swagger
 * components:
 *  responses:
 *      UserAddedWithGames:
 *          description: The user was added with games
 *  requestBodies:
 *      UserToAddWithGames:
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      properties:
 *                          username:
 *                              type: string
 *                              description: The user username
 *                          email:
 *                              type: string
 *                              description: The user email
 *                          firstname:
 *                              type: string
 *                              description: The user firstname
 *                          lastname:
 *                              type: string
 *                              description: The user lastname
 *                          password:
 *                              type: string
 *                              description: The user password
 *                          is_admin:
 *                              type: boolean
 *                              description: The user status
 *                          publications_ids:
 *                              type: array
 *                              items:
 *                                  type: integer
 *                                  description: The publication ids
 *                      required:
 *                          - username
 *                          - email
 *                          - password
 *                          - publication_ids
 */
module.exports.createUserWithGames = async (req, res) => {
    let username,
        email,
        firstname,
        lastname,
        password,
        isAdmin,
        publicationsIds;
    try {
        ({
            username,
            email,
            firstname,
            lastname,
            password,
            is_admin: isAdmin,
            publications_ids: publicationsIds,
        } = validateObject(req.body, userWithGamesSchema));
    } catch (error) {
        res.status(HTTPStatus.BAD_REQUEST).json({
            code: "INVALID_INPUT",
            message: error.message,
        });
        return;
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const userId = (
            await UserDB.createUser(
                client,
                username,
                email,
                await bcrypt.hash(password, 10),
                firstname,
                lastname,
                isAdmin
            )
        ).rows[0].id;

        for (const id of publicationsIds) {
            const { rows: publications } = await PublicationDB.getPublication(
                client,
                {publicationId: id},
            );

            if (publications.length === 0) {
                await client.query("ROLLBACK");
                res.status(HTTPStatus.NOT_FOUND).json({
                    code: "RESOURCE_NOT_FOUND",
                    message: `No publication found with id ${id}`,
                });
                return;
            }

            await GamesDB.createGame(client, userId, publications[0].id);
        }

        await client.query("COMMIT");
        res.sendStatus(HTTPStatus.CREATED);
    } catch (error) {
        await client.query("ROLLBACK");
        switch (error.code) {
            case PGErrors.UNIQUE_VIOLATION:
                res.status(HTTPStatus.CONFLICT).json({
                    code: "DUPLICATE_ENTRY",
                    message: error.detail,
                });
                break;
            default:
                res.sendStatus(HTTPStatus.INTERNAL_SERVER_ERROR);
        }
    } finally {
        client.release();
    }
};

/**
 * Get one or all users
 *
 * @param {Request} req
 * @param {Response} res
 *
 * @returns {Promise<void>}
 *
 * @swagger
 * components:
 *  responses:
 *      UsersFound:
 *          description: User/users was/were found
 *          content:
 *              application/json:
 *                  schema:
 *                      type: array
 *                      items:
 *                          $ref: '#/components/schemas/User'
 */
module.exports.getUser = async (req, res) => {
    let id, page, limit, username;
    try {
        ({ id, page, limit, username } = validateObject(req.query, getUserSchema));
    } catch (error) {
        res.status(HTTPStatus.BAD_REQUEST).json({
            code: "INVALID_INPUT",
            message: error.message,
        });
        return;
    }

    const client = await pool.connect();
    try {
        const { rows: users } = await UserDB.getUser(client, id, username, page, limit);
        if (users.length === 0) {
            res.status(HTTPStatus.NOT_FOUND).json({
                code: "RESOURCE_NOT_FOUND",
                message: "No user found",
            });
            return;
        }
        res.json(users);
    } catch (error) {
        res.sendStatus(HTTPStatus.INTERNAL_SERVER_ERROR);
    } finally {
        client.release();
    }
};

/**
 * Get user from his token
 *
 * @param {Request} req
 * @param {Response} res
 *
 * @returns {Promise<void>}
 *
 * @swagger
 * components:
 *  responses:
 *      UserFound:
 *          description: User/users was/were found
 *          content:
 *              application/json:
 *                  schema:
 *                      $ref: '#/components/schemas/User'
 */
module.exports.getUserFromToken = async (req, res) => {
    const { id } = req.session;
    const client = await pool.connect();
    try {
        const { rows: user } = await UserDB.getUser(client, id);
        if (user.length === 0) {
            res.status(HTTPStatus.NOT_FOUND).json({
                code: "RESOURCE_NOT_FOUND",
                message: "No user found",
            });
            return;
        }
        res.json(user[0]);
    } catch (error) {
        res.sendStatus(HTTPStatus.INTERNAL_SERVER_ERROR);
    } finally {
        client.release();
    }
};

/**
 * Get the number of users
 *
 * @param {Request} req
 * @param {Response} res
 *
 * @returns {Promise<void>}
 *
 *
 * @swagger
 * components:
 *  responses:
 *      UserCount:
 *          description: The user count
 *          content:
 *              application/json:
 *                  schema:
 *                      type: string
 *                      description: The user count
 */
module.exports.getUserCount = async (req, res) => {
    const client = await pool.connect();
    try {
        const { rows: users } = await UserDB.getUserCount(client);
        res.json(users[0].no);
    } catch (error) {
        res.sendStatus(HTTPStatus.INTERNAL_SERVER_ERROR);
    } finally {
        client.release();
    }
};
