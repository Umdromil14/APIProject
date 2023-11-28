/**
 * @swagger
 * components:
 *  schemas:
 *      VideoGame:
 *          type: object
 *          properties:
 *              id:
 *                  type: integer
 *                  description: The id of the video game
 *              name:
 *                  type: string
 *                  description: The name of the video game
 *              description:
 *                  type: string
 *                  description: The description of the video game
 */

const pool = require("../model/database");
const VideoGameModel = require("../model/videoGame");
const PublicationModel = require("../model/publication");
const GameModel = require("../model/game");
const CategoryModel = require("../model/category");
const HTTPStatus = require("../tools/HTTPStatus.js");
const tools = require("../tools/utils.js");

const {
    getVideoGameSchema,
    videoGameSchema,
} = require("../zod/schema/videoGame.js");
const { validateObject } = require("../zod/zod");

/**
 * Get a video game by its id or get a video game containing the name
 * 
 * @param {Request} req
 * @param {Response} res
 * 
 * @returns {Promise<void>}
 * 
 * @swagger
 * components:
 *  responses:
 *      VideoGameFound:
 *          description: A video game was found
 *          content:
 *              application/json:
 *                  schema:
 *                      $ref: '#/components/schemas/VideoGame'

 */
module.exports.getVideoGame = async (req, res) => {
    let id, name;
    try {
        ({ id, name } = validateObject(req.query, getVideoGameSchema));
    } catch (error) {
        res.status(HTTPStatus.BAD_REQUEST).send(error.message);
        return;
    }

    const client = await pool.connect();
    try {
        const { rows: videoGames } = await VideoGameModel.getVideoGames(
            client,
            id,
            name
        );
        if (videoGames.length === 0) {
            res.status(HTTPStatus.NOT_FOUND).send("No video game found");
            return;
        }
        res.json(videoGames);
    } catch (error) {
        res.status(HTTPStatus.INTERNAL_SERVER_ERROR).send(
            "Internal Server Error"
        );
    } finally {
        client.release();
    }
};

/**
 * Post a video game with a name and a description
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
 *      VideoGameAdded:
 *          description: The video game was added
 *  requestBodies:
 *      VideoGameToAdd:
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      properties:
 *                          name:
 *                              type: string
 *                              description: The name of the video game
 *                          description:
 *                              type: string
 *                              description: The description of the video game
 *                      required:
 *                          - name
 *                          - description

 */
module.exports.postVideoGame = async (req, res) => {
    let name, description;
    try {
        ({ name, description } = validateObject(req.body, videoGameSchema));
    } catch (error) {
        res.status(HTTPStatus.BAD_REQUEST).send(error.message);
        return;
    }

    const client = await pool.connect();
    try {
        await VideoGameModel.createVideoGame(client, name, description);
        res.status(HTTPStatus.CREATED).send("Video Game created");
    } catch (error) {
        res.status(HTTPStatus.INTERNAL_SERVER_ERROR).send(
            "Internal Server Error"
        );
    } finally {
        client.release();
    }
};

/**
 * Update a video game by its id
 * 
 * @param {Request} req from the url and the body, need to be fill with a name or a description
 * @param {Response} res
 * 
 * @returns {Promise<void>}
 * 
 * 
 * @swagger
 * components:
 *  responses:
 *      VideoGameUpdated:
 *          description: The video game was updated
 *  requestBodies:
 *      VideoGameToUpdate:
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      properties:
 *                          name:
 *                              type: string
 *                              description: The name of the video game
 *                          description:
 *                              type: string
 *                              description: The description of the video game

 */
module.exports.updateVideoGame = async (req, res) => {
    const id = parseInt(req.params.id);
    let videoGame;
    if (isNaN(id)) {
        res.status(HTTPStatus.BAD_REQUEST).send("Id must be a Number");
        return;
    }
    try {
        videoGame = validateObject(req.body, videoGameSchema.partial());
    } catch (error) {
        res.status(HTTPStatus.BAD_REQUEST).send(error.message);
        return;
    }

    const client = await pool.connect();
    try {
        const { rowCount } = await VideoGameModel.updateVideoGame(
            client,
            id,
            videoGame
        );
        if (rowCount === 0) {
            res.status(HTTPStatus.NOT_FOUND).send("No video game found");
            return;
        }
        res.sendStatus(HTTPStatus.NO_CONTENT);
    } catch (error) {
        res.status(HTTPStatus.INTERNAL_SERVER_ERROR).send(
            "Internal Server Error"
        );
    } finally {
        client.release();
    }
};

/**
 * Delete a video game by its id
 * 
 * @param {Request} req Id from the url
 * @param {Response} res
 * 
 * @returns {Promise<void>}
 * 
 * @swagger
 * components:
 *  responses:
 *      VideoGameDeleted:
 *          description: The video game was deleted

 */
module.exports.deleteVideoGame = async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        res.status(HTTPStatus.BAD_REQUEST).send("Id must be a Number");
        return;
    }
    const client = await pool.connect();
    try {
        const publicationIds = (
            await PublicationModel.getPublication(client, undefined, undefined, id)
        ).rows;
        if (publicationIds.length === 0) {
            res.status(HTTPStatus.NOT_FOUND).send("No video game found");
            return;
        }
        client.query("BEGIN");
        for (const publicationId of publicationIds) {
            await GameModel.deleteGamesFromPublication(
                client,
                publicationId.id
            );
            await PublicationModel.deletePublication(client, publicationId.id);
        }
        await CategoryModel.deleteCategoriesFromVideoGame(client, id);
        await VideoGameModel.deleteVideoGame(client, id);
        client.query("COMMIT");
        res.sendStatus(HTTPStatus.NO_CONTENT);
    } catch (error) {
        client.query("ROLLBACK");
        res.status(HTTPStatus.INTERNAL_SERVER_ERROR).send(
            "Internal Server Error"
        );
    } finally {
        client.release();
    }
};