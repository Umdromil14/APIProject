const AuthoMiddleware = require('../middleware/Authorization');
const JWTMiddleWare = require('../middleware/Identification');
const VideoGameController = require("../controller/videoGame.js");
const Router = require("express-promise-router");
const router = new Router();
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    dest: 'pictures/videoGame'
});

/**
 * @swagger
 * /videoGame:
 *  get:
 *      tags:
 *          - VideoGame
 *      description: Get one or more videoGames based on query parameters
 *      parameters:
 *          - name: id
 *            description: The video game id
 *            in: query
 *            required: false
 *            schema:
 *              type: integer
 *          - name: name
 *            description: The video game name
 *            in: query
 *            required: false
 *            schema:
 *              type: string
 *          - name: page
 *            description: Page number
 *            in: query
 *            required: false
 *            schema:
 *              type: integer
 *          - name: limit
 *            description: The max number of values returned
 *            in: query
 *            required: false
 *            schema:
 *              type: integer
 *      responses : 
 *          200:
 *              $ref: '#/components/responses/VideoGameFound'
 *          400:
 *              description: INVALID_INPUT
 *          404:
 *              description: RESOURCE_NOT_FOUND
 *          500:
 *              description: Internal server error
 */
router.get("/", VideoGameController.getVideoGame);

/**
 * @swagger
 * /videoGame/count:
 *  get:
 *      tags:
 *          - VideoGame
 *      description: Get the video game count
 *      responses : 
 *          200:
 *              $ref: '#/components/responses/VideoGameCount'
 *          500:
 *              description: Internal server error
 */
router.get("/count", VideoGameController.getVideoGameCount);

/**
 * @swagger
 * /videoGame:
 *  post:
 *      tags:
 *          - VideoGame
 *      description: Create a new video game
 *      security:
 *          - bearerAuth: []
 *      requestBody: 
 *          $ref: '#/components/requestBodies/VideoGameToAdd'
 *      responses : 
 *          201:
 *              $ref: '#/components/responses/VideoGameAdded'
 *          400:
 *              description: INVALID_INPUT or INVALID_JWT
 *          401:
 *              $ref: '#/components/responses/MissingJWT'
 *          403:
 *              $ref: '#/components/responses/MustBeAdmin'
 *          404:
 *              $ref: '#/components/responses/DeprecatedJWT'
 *          500:
 *              description: Internal server error
 */
router.post("/", JWTMiddleWare.identification, AuthoMiddleware.mustBeAdmin,upload.fields([
    { name: 'picture', maxCount: 1 },
    { name: 'name' , maxCount: 1 },
    { name: 'description' , maxCount: 1},
]) ,VideoGameController.createVideoGame);

/**
 * @swagger
 * /videoGame/{id}:
 *  patch:
 *      tags:
 *          - VideoGame
 *      description: Update a video game by its id
 *      security:
 *          - bearerAuth: []
 *      parameters:
 *          - name: id
 *            description: The video game id
 *            in: path
 *            required: true
 *            schema:
 *              type: integer
 *      requestBody:
 *          $ref: '#/components/requestBodies/VideoGameToUpdate'
 *      responses : 
 *          204:
 *              $ref: '#/components/responses/VideoGameUpdated'
 *          400:
 *              description: INVALID_INPUT or INVALID_JWT
 *          401:
 *              $ref: '#/components/responses/MissingJWT'
 *          403:
 *              $ref: '#/components/responses/MustBeAdmin'
 *          404:
 *              description: RESOURCE_NOT_FOUND or JWT_DEPRECATED
 *          500:
 *              description: Internal server error
 */
router.patch("/:id", JWTMiddleWare.identification, AuthoMiddleware.mustBeAdmin,upload.fields([
    { name: 'picture', maxCount: 1 },
    { name: 'name' , maxCount: 1 },
    { name: 'description' , maxCount: 1},
]) ,VideoGameController.updateVideoGame);

/**
 * @swagger
 * /videoGame/{id}:
 *  delete:
 *      tags:
 *          - VideoGame
 *      description: Delete a video game
 *      security:
 *          - bearerAuth: []
 *      parameters:
 *          - name: id
 *            description: The video game id
 *            in: path
 *            required: true
 *            schema:
 *              type: integer
 *      responses : 
 *          204:
 *              $ref: '#/components/responses/VideoGameDeleted'
 *          400:
 *              description: INVALID_INPUT or INVALID_JWT
 *          401:
 *              $ref: '#/components/responses/MissingJWT'
 *          403:
 *              $ref: '#/components/responses/MustBeAdmin'
 *          404:
 *              description: RESOURCE_NOT_FOUND or JWT_DEPRECATED
 *          500:
 *              description: Internal server error
 */
router.delete("/:id", JWTMiddleWare.identification, AuthoMiddleware.mustBeAdmin, VideoGameController.deleteVideoGame);

module.exports = router;