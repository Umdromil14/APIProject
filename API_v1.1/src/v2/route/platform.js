const AuthoMiddleware = require("../middleware/Authorization");
const JWTMiddleWare = require("../middleware/Identification");
const PlatformController = require("../controller/platform");
const Router = require("express-promise-router");
const router = new Router();
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    dest: "pictures/platform",
});

/**
 * @swagger
 * /platform:
 *  post:
 *      tags:
 *          - Platform
 *      description: Create a new platform
 *      security:
 *          - bearerAuth: []
 *      requestBody:
 *          $ref: '#/components/requestBodies/PlatformToAdd'
 *      responses:
 *          201:
 *              $ref: '#/components/responses/PlatformAdded'
 *          400:
 *              description: INVALID_INPUT or INVALID_JWT
 *          401:
 *              $ref: '#/components/responses/MissingJWT'
 *          403:
 *              $ref: '#/components/responses/MustBeAdmin'
 *          404:
 *              $ref: '#/components/responses/DeprecatedJWT'
 *          409:
 *              description: DUPLICATE_ENTRY
 *          500:
 *              description: Internal server error
 */
router.post(
    "/",
    JWTMiddleWare.identification,
    AuthoMiddleware.mustBeAdmin,
    upload.fields([
        { name: "picture", maxCount: 1 },
        { name: "code", maxCount: 1 },
        { name: "description", maxCount: 1 },
        { name: "abbreviation", maxCount: 1 },
    ]),
    PlatformController.createPlatform
);

/**
 * @swagger
 * /platform/withVideoGames:
 *  post:
 *      tags:
 *          - Platform
 *      description: Create a new platform with new video games
 *      security:
 *          - bearerAuth: []
 *      requestBody:
 *          $ref: '#/components/requestBodies/PlatformToAddWithVideoGames'
 *      responses:
 *          201:
 *              $ref: '#/components/responses/PlatformAddedWithVideoGames'
 *          400:
 *              description: INVALID_INPUT or INVALID_JWT
 *          401:
 *              $ref: '#/components/responses/MissingJWT'
 *          403:
 *              $ref: '#/components/responses/MustBeAdmin'
 *          404:
 *              $ref: '#/components/responses/DeprecatedJWT'
 *          409:
 *              description: DUPLICATE_ENTRY
 *          500:
 *              description: Internal server error
 */
router.post(
    "/withVideoGames",
    JWTMiddleWare.identification,
    AuthoMiddleware.mustBeAdmin,
    upload.fields([
        { name: "code", maxCount: 1 },
        { name: "description", maxCount: 1 },
        { name: "abbreviation", maxCount: 1 },
        { name: "video_games", maxCount: 1},
        { name: "platformPicture", maxCount: 1 },
        { name: "videoGamesPictures", maxCount: 10 },
    ]),
    PlatformController.createPlatformWithNewVideoGames
);

/**
 * @swagger
 * /platform:
 *  get:
 *      tags:
 *          - Platform
 *      description: Get one or more platforms based on query parameters
 *      parameters:
 *          - name: code
 *            description: The platform code (will be converted to uppercase)
 *            in: query
 *            required: false
 *            schema:
 *              type: string
 *          - name: page
 *            description: the chosen page
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
 *      responses:
 *          200:
 *              $ref: '#/components/responses/PlatformsFound'
 *          404:
 *              description: RESOURCE_NOT_FOUND
 *          500:
 *              description: Internal server error
 */
router.get("/", PlatformController.getPlatform);

/**
 * @swagger
 * /platform/count:
 *  get:
 *      tags:
 *          - Platform
 *      description: get platform count
 *      responses:
 *          200:
 *              $ref: '#/components/responses/PlatformsCount'
 *          500:
 *              description: Internal server error
 */
router.get("/count", PlatformController.getPlatformsCount);

/**
 * @swagger
 * /platform/{code}:
 *  patch:
 *      tags:
 *          - Platform
 *      description: Update a platform
 *      security:
 *          - bearerAuth: []
 *      parameters:
 *          - name: code
 *            description: The platform code (will be converted to uppercase)
 *            in: path
 *            required: true
 *            schema:
 *              type: string
 *      requestBody:
 *          $ref: '#/components/requestBodies/PlatformToUpdate'
 *      responses:
 *          204:
 *              $ref: '#/components/responses/PlatformUpdated'
 *          400:
 *              description: INVALID_INPUT or INVALID_JWT
 *          401:
 *              $ref: '#/components/responses/MissingJWT'
 *          403:
 *              $ref: '#/components/responses/MustBeAdmin'
 *          404:
 *              description: RESOURCE_NOT_FOUND or JWT_DEPRECATED
 *          409:
 *              description: DUPLICATE_ENTRY
 *          500:
 *              description: Internal server error
 */
router.patch(
    "/:code",
    JWTMiddleWare.identification,
    AuthoMiddleware.mustBeAdmin,
    upload.fields([
        { name: "picture", maxCount: 1 },
        { name: "code", maxCount: 1 },
        { name: "description", maxCount: 1 },
        { name: "abbreviation", maxCount: 1 },
    ]),
    PlatformController.updatePlatform
);

/**
 * @swagger
 * /platform/{code}:
 *  delete:
 *      tags:
 *          - Platform
 *      description: Delete a platform
 *      security:
 *          - bearerAuth: []
 *      parameters:
 *          - name: code
 *            description: The platform code (will be converted to uppercase)
 *            in: path
 *            required: true
 *            schema:
 *              type: string
 *      responses:
 *          204:
 *              $ref: '#/components/responses/PlatformDeleted'
 *          400:
 *              $ref: '#/components/responses/ErrorJWT'
 *          401:
 *              $ref: '#/components/responses/MissingJWT'
 *          403:
 *              $ref: '#/components/responses/MustBeAdmin'
 *          404:
 *              description: RESOURCE_NOT_FOUND or JWT_DEPRECATED
 *          500:
 *              description: Internal server error
 */
router.delete(
    "/:code",
    JWTMiddleWare.identification,
    AuthoMiddleware.mustBeAdmin,
    PlatformController.deletePlatform
);

module.exports = router;
