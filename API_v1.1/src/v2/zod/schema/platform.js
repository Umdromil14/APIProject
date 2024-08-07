const { z } = require("zod");
const ACCEPTED_IMAGE_TYPES = [
    "image/jpg",
    "image/jpeg",
    "image/png",
    "image/webp",
];

module.exports.platformSchema = z.object({
    code: z.string().trim().min(1).toUpperCase(),
    description: z.string().trim().min(1),
    abbreviation: z.string().trim().min(1),
});

module.exports.platformWithVideoGamesSchema = this.platformSchema.extend({
    video_games: z.array(
        z.object({
            name: z.string().trim().min(1),
            description: z.string().trim(),
            release_date: z.coerce.date(),
            release_price: z.coerce
                .number()
                .nonnegative()
                .optional()
                .nullable(),
            store_page_url: z.string().trim().url().optional().nullable(),
        })
    ),
});

module.exports.getPlatformSchema = z.object({
    code: z.string().trim().min(1).toUpperCase().optional(),
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(50).optional(),
});
