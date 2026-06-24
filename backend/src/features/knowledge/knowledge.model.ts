import mongoose, { Schema, Document } from 'mongoose';

export interface IKnowledgeArticle extends Document {
    title: string;
    slug: string;
    content: string;
    category: string;
    tags: string[];
    author: mongoose.Types.ObjectId;
    isPublished: boolean;
    viewCount: number;
    helpfulCount: number;
    createdAt: Date;
    updatedAt: Date;
}

const KnowledgeArticleSchema: Schema = new Schema({
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    content: { type: String, required: true },
    category: { type: String, required: true },
    tags: { type: [String], default: [] },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isPublished: { type: Boolean, default: false },
    viewCount: { type: Number, default: 0 },
    helpfulCount: { type: Number, default: 0 }
}, {
    timestamps: true
});

export default mongoose.model<IKnowledgeArticle>('KnowledgeArticle', KnowledgeArticleSchema);
