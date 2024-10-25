import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";


const commentSchema = new Schema(
    {
        content: {
            type: String,
            required: true
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        video: {
            type: Schema.Types.ObjectId,
            ref: 'Video',
            required: true
        }
    },
    {
        timestamps: true
    }
)


// Add plugin to schema
commentSchema.plugin(mongooseAggregatePaginate)

export const Comment = mongoose.model('Comment', commentSchema)