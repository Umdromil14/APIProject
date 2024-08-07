const pool = require("../model/database");
const PlatformModel = require("../model/platform");
const VideoGameModel = require("../model/videoGame");
const GameModel = require("../model/game");
const PublicationModel = require("../model/publication");
const HTTPStatus = require("../tools/HTTPStatus");
const PGErrors = require("../tools/PGErrors");
const { validateObject } = require("../zod/zod");
const {
    platformSchema,
    platformWithVideoGamesSchema,
    getPlatformSchema,
} = require("../zod/schema/platform");
const destFolderPlatform = "pictures/platform";
const destFolderVideoGame = "pictures/videoGame";
const {
    saveImageToPng,
    deleteImage,
    modifyImageName,
} = require("../model/imageManager");

/**
 * @swagger
 * components:
 *  schemas:
 *     Platform:
 *         type: object
 *         properties:
 *             code:
 *                 type: string
 *                 description: The code of the platform
 *             description:
 *                 type: string
 *                 description: The description of the platform
 *             abbreviation:
 *                 type: string
 *                 description: The abbreviation of the platform
 */

/**
 * Get all platforms or a platform by its code
 *
 * @param {Request} req
 * @param {Response} res
 *
 * @returns {Promise<void>}
 *
 * @swagger
 * components:
 *  responses:
 *      PlatformsFound:
 *          description: Platforms were found
 *          content:
 *              application/json:
 *                  schema:
 *                      type: array
 *                      items:
 *                          $ref: '#/components/schemas/Platform'
 */
module.exports.getPlatform = async (req, res) => {
    let code, page, limit;
    try {
        ({ code, page, limit } = validateObject(req.query, getPlatformSchema));
    } catch (error) {
        res.status(HTTPStatus.BAD_REQUEST).json({
            code: "INVALID_INPUT",
            message: error.message,
        });
        return;
    }

    const client = await pool.connect();
    try {
        const { rows: platforms } = await PlatformModel.getPlatforms(
            client,
            code,
            page,
            limit
        );
        if (platforms.length === 0) {
            res.status(HTTPStatus.NOT_FOUND).json({
                code: "RESOURCE_NOT_FOUND",
                message: "No platforms found",
            });
            return;
        }
        res.json(platforms);
    } catch (error) {
        res.sendStatus(HTTPStatus.INTERNAL_SERVER_ERROR);
    } finally {
        client.release();
    }
};

/**
 * Get the number of platforms
 *
 * @param {Request} req
 * @param {Response} res
 *
 * @returns {Promise<void>}
 *
 * @swagger
 * components:
 *  responses:
 *      PlatformsCount:
 *          description: The number of platforms
 *          content:
 *              application/json:
 *                  schema:
 *                      type: string
 *                      description: The number of platforms
 */
module.exports.getPlatformsCount = async (req, res) => {
    const client = await pool.connect();
    try {
        const { rows: platforms } =
            await PlatformModel.getPlatformsCount(client);

        res.json(platforms[0].no);
    } catch (error) {
        res.sendStatus(HTTPStatus.INTERNAL_SERVER_ERROR);
    } finally {
        client.release();
    }
};

/**
 * Create a new platform
 *
 * @param {Request} req
 * @param {Response} res
 *
 * @returns {Promise<void>}
 *
 * @swagger
 * components:
 *  responses:
 *      PlatformAdded:
 *          description: The platform was added
 *  requestBodies:
 *      PlatformToAdd:
 *          content:
 *              multipart/form-data:
 *                  schema:
 *                      type: object
 *                      properties:
 *                          code:
 *                              type: string
 *                              description: The platform code (will be converted to uppercase)
 *                          description:
 *                              type: string
 *                              description: The platform description
 *                          abbreviation:
 *                              type: string
 *                              description: The platform abbreviation
 *                          picture:
 *                              type: string
 *                              format: base64
 *                              description: The platform picture
 *                      required:
 *                          - code
 *                          - description
 *                          - abbreviation
 *                          - picture
 *                  encoding:
 *                      picture:
 *                          contentType: image/png, image/jpeg, image/webp
 */
module.exports.createPlatform = async (req, res) => {
    let code, description, abbreviation;
    try {
        ({ code, description, abbreviation } = validateObject(
            req.body,
            platformSchema
        ));
    } catch (error) {
        res.status(HTTPStatus.BAD_REQUEST).json({
            code: "INVALID_INPUT",
            message: error.message,
        });
        return;
    }
    if (!req.files.picture) {
        res.status(HTTPStatus.BAD_REQUEST).json({
            code: "INVALID_INPUT",
            message: "No picture",
        });
        return;
    }
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await PlatformModel.createPlatform(
            client,
            code,
            description,
            abbreviation
        );
        await saveImageToPng(
            req.files.picture[0].buffer,
            code,
            destFolderPlatform
        );
        await client.query("COMMIT");
        res.sendStatus(HTTPStatus.CREATED);
    } catch (error) {
        await client.query("ROLLBACK");

        if (error.code === PGErrors.UNIQUE_VIOLATION) {
            res.status(HTTPStatus.CONFLICT).json({
                code: "DUPLICATE_ENTRY",
                message: error.detail,
            });
        } else if (error.message?.includes("format")) {
            res.status(HTTPStatus.BAD_REQUEST).json({
                code: "INVALID_INPUT",
                message: "Invalid image format",
            });
        } else {
            res.sendStatus(HTTPStatus.INTERNAL_SERVER_ERROR);
        }
    } finally {
        client.release();
    }
};

/**
 * Update a platform
 *
 * @param {Request} req
 * @param {Response} res
 *
 * @returns {Promise<void>}
 *
 * @swagger
 * components:
 *  responses:
 *      PlatformUpdated:
 *          description: The platform was updated
 *  requestBodies:
 *      PlatformToUpdate:
 *          content:
 *              multipart/form-data:
 *                  schema:
 *                      type: object
 *                      properties:
 *                          code:
 *                              type: string
 *                              description: The platform code (will be converted to uppercase)
 *                          description:
 *                              type: string
 *                              description: The platform description
 *                          abbreviation:
 *                              type: string
 *                              description: The platform abbreviation
 *                          picture:
 *                              type: string
 *                              format: base64
 *                              description: The platform picture
 *                  encoding:
 *                      picture:
 *                          contentType: image/png, image/jpeg, image/webp
 */
module.exports.updatePlatform = async (req, res) => {
    let updateValues;
    try {
        updateValues = validateObject(req.body, platformSchema.partial());
    } catch (error) {
        res.status(HTTPStatus.BAD_REQUEST).json({
            code: "INVALID_INPUT",
            message: error.message,
        });
        return;
    }
    const code = req.params.code.toUpperCase();

    if (Object.keys(updateValues).length === 0) {
        res.status(HTTPStatus.BAD_REQUEST).json({
            code: "INVALID_INPUT",
            message: "No values to update",
        });
        return;
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const { rowCount } = await PlatformModel.updatePlatform(
            client,
            code,
            updateValues
        );
        if (rowCount === 0) {
            res.status(HTTPStatus.NOT_FOUND).json({
                code: "RESOURCE_NOT_FOUND",
                message: "No platform found",
            });
            await client.query("ROLLBACK");
            return;
        }
        if (req.files.picture) {
            deleteImage(code, destFolderPlatform);
            await saveImageToPng(
                req.files.picture[0].buffer,
                updateValues.code,
                destFolderPlatform
            );
        } else {
            if (code !== updateValues.code) {
                modifyImageName(code, updateValues.code, destFolderPlatform);
            }
        }
        await client.query("COMMIT");
        res.sendStatus(HTTPStatus.NO_CONTENT);
    } catch (error) {
        await client.query("ROLLBACK");

        if (error.code === PGErrors.UNIQUE_VIOLATION) {
            res.status(HTTPStatus.CONFLICT).json({
                code: "DUPLICATE_ENTRY",
                message: error.detail,
            });
        } else if (error.message?.includes("format")) {
            res.status(HTTPStatus.BAD_REQUEST).json({
                code: "INVALID_INPUT",
                message: "Invalid image format",
            });
        } else {
            res.sendStatus(HTTPStatus.INTERNAL_SERVER_ERROR);
        }
    } finally {
        client.release();
    }
};

/**
 * Delete a platform
 *
 * @param {Request} req
 * @param {Response} res
 *
 * @returns {Promise<void>}
 *
 * @swagger
 * components:
 *  responses:
 *      PlatformDeleted:
 *          description: The platform was deleted
 */
module.exports.deletePlatform = async (req, res) => {
    const code = req.params.code.toUpperCase();

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const { rows: publicationsIds } = await PublicationModel.getPublication(
            client,
            { platformCode: code }
        );
        for (const publicationId of publicationsIds) {
            await GameModel.deleteGamesFromPublication(
                client,
                publicationId.id
            );
            await PublicationModel.deletePublication(client, publicationId.id);
        }

        const { rowCount } = await PlatformModel.deletePlatform(client, code);
        if (rowCount === 0) {
            res.status(HTTPStatus.NOT_FOUND).json({
                code: "RESOURCE_NOT_FOUND",
                message: "No platform found",
            });
            await client.query("ROLLBACK");
            return;
        }
        await client.query("COMMIT");
        deleteImage(code, destFolderPlatform);
        res.sendStatus(HTTPStatus.NO_CONTENT);
    } catch (error) {
        await client.query("ROLLBACK");
        res.sendStatus(HTTPStatus.INTERNAL_SERVER_ERROR);
    } finally {
        client.release();
    }
};

/**
 * Create a new platform with new video games
 *
 * @param {Request} req
 * @param {Response} res
 *
 * @returns {Promise<void>}
 *
 * @swagger
 * components:
 *  responses:
 *      PlatformAddedWithVideoGames:
 *          description: The platform was added with video games
 *  requestBodies:
 *      PlatformToAddWithVideoGames:
 *          content:
 *              multipart/form-data:
 *                  schema:
 *                      type: object
 *                      properties:
 *                          code:
 *                              type: string
 *                              description: The platform code (will be converted to uppercase)
 *                          description:
 *                              type: string
 *                              description: The platform description
 *                          abbreviation:
 *                              type: string
 *                              description: The platform abbreviation
 *                          videoGamesPictures :
 *                              type : array
 *                              description : The video games pictures
 *                              items :
 *                                  type : string
 *                                  format : binary
 *                                  description : The video game picture
 *                          platformPicture:
 *                              type: string
 *                              format: binary
 *                              description: The platform picture
 *                          video_games:
 *                              type: array
 *                              items:
 *                                  type: object
 *                                  properties:
 *                                      name:
 *                                          type: string
 *                                          description: The video game name
 *                                      description:
 *                                          type: string
 *                                          description: The video game description
 *                                      release_date:
 *                                          type: string
 *                                          format: date
 *                                          description: The video game release date (YYYY-MM-DD or MM-DD-YYYY)
 *                                      release_price:
 *                                          type: number
 *                                          format: float
 *                                          description: The video game release price
 *                                      store_page_url:
 *                                          type: string
 *                                          format: url
 *                                          description: The video game store page url
 *                                  required:
 *                                      - name
 *                                      - description
 *                                      - release_date
 *                      required:
 *                          - code
 *                          - description
 *                          - abbreviation
 *                          - video_games
 *                          - platformPicture
 *                          - videoGamesPictures
 *                  encoding:
 *                      platformPicture:
 *                          contentType: image/png, image/jpeg, image/webp
 *                      videoGamesPictures:
 *                          contentType: image/png, image/jpeg, image/webp
 */
module.exports.createPlatformWithNewVideoGames = async (req, res) => {
    const video_games = JSON.parse(req.body.video_games);
    let code, description, abbreviation, videoGames;
    try {
        ({
            code,
            description,
            abbreviation,
            video_games: videoGames,
        } = validateObject(
            { ...req.body, video_games },
            platformWithVideoGamesSchema
        ));
    } catch (error) {
        res.status(HTTPStatus.BAD_REQUEST).json({
            code: "INVALID_INPUT",
            message: error.message,
        });
        return;
    }
    if (!req.files.platformPicture?.[0]) {
        res.status(HTTPStatus.BAD_REQUEST).json({
            code: "INVALID_INPUT",
            message: "No picture for the platform",
        });
        return;
    }
    if (req.files.videoGamesPictures?.length !== videoGames.length) {
        res.status(HTTPStatus.BAD_REQUEST).json({
            code: "INVALID_INPUT",
            message: "No picture for one or many video game(s)",
        });
        return;
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await PlatformModel.createPlatform(
            client,
            code,
            description,
            abbreviation
        );
        await saveImageToPng(picture.buffer, code, destFolderPlatform);

        for (const videoGame of videoGames) {
            const videoGameId = (
                await VideoGameModel.createVideoGame(
                    client,
                    videoGame.name,
                    videoGame.description
                )
            ).rows[0].id;
            await saveImageToPng(
                videoGamesPictures.shift().buffer,
                videoGameId,
                destFolderVideoGame
            );

            await PublicationModel.createPublication(
                client,
                code,
                videoGameId,
                videoGame.release_date,
                videoGame.release_price,
                videoGame.store_page_url
            );
        }

        await client.query("COMMIT");
        res.sendStatus(HTTPStatus.CREATED);
    } catch (error) {
        await client.query("ROLLBACK");

        if (error.code === PGErrors.UNIQUE_VIOLATION) {
            res.status(HTTPStatus.CONFLICT).json({
                code: "DUPLICATE_ENTRY",
                message: error.detail,
            });
        } else if (error.message?.includes("format")) {
            res.status(HTTPStatus.BAD_REQUEST).json({
                code: "INVALID_INPUT",
                message: "Invalid image format",
            });
        } else {
            res.sendStatus(HTTPStatus.INTERNAL_SERVER_ERROR);
        }
    } finally {
        client.release();
    }
};
