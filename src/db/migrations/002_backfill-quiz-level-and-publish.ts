import type { Db } from 'mongodb';
import { QuizLevel } from '../../types/enums';

export async function up(db: Db): Promise<void> {
  await db.collection('quizzes').updateMany(
    { level: { $exists: false } },
    { $set: { level: QuizLevel.Medium } }
  );
  await db.collection('quizzes').updateMany(
    { isPublished: { $exists: false } },
    { $set: { isPublished: true } }
  );
}

export async function down(db: Db): Promise<void> {
  await db.collection('quizzes').updateMany(
    {},
    {
      $unset: {
        level: '',
        isPublished: '',
      },
    }
  );
}
