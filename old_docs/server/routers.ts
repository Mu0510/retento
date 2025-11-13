import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { createSession, createQuestion, upsertUserWordProgress, getSessionQuestions, getDb } from "./db";
import { selectWordsForSession } from "./db-helpers";
import { generateBatchQuestions } from "./ai-batch";
import { TRPCError } from "@trpc/server";
import { words, userInitialTestResults } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // 学習機能
  learning: router({
    // セッションを開始する（問題を生成）
    startSession: protectedProcedure.mutation(async ({ ctx }) => {
      const userId = ctx.user.id;

      // 事前生成された問題を確認
      const { getPreGeneratedSession } = await import("./pre-generate-helpers");
      const preGenerated = await getPreGeneratedSession(userId);
      
      if (preGenerated && preGenerated.length > 0) {
        console.log(`[StartSession] Using pre-generated session for user ${userId}`);
        
        // セッションを作成
        const sessionId = await createSession({
          userId,
          theme: null,
          status: "in_progress",
          totalQuestions: preGenerated.length,
          startedAt: new Date(),
        });
        
        // 事前生成された問題をデータベースに保存
        for (const generated of preGenerated) {
          const wordIndex = generated.wordIndex - 1;
          
          // word情報を取得
          const db = await getDb();
          if (!db) continue;
          
          const wordResult = await db.select().from(words).where(eq(words.id, generated.wordId)).limit(1);
          if (wordResult.length === 0) continue;
          
          const word = wordResult[0];
          const correctAnswer = word.commonMeaning1;
          const wrongChoices = generated.wrongChoices;
          
          // 選択肢をシャッフル
          const allChoices = [correctAnswer, ...wrongChoices];
          const shuffled = allChoices.sort(() => Math.random() - 0.5);
          
          // 各選択肢に対応するフィードバックを特定
          const feedbackMap: Record<string, string> = {
            [correctAnswer]: generated.feedbacks.correct,
            [wrongChoices[0]]: generated.feedbacks.choice1,
            [wrongChoices[1]]: generated.feedbacks.choice2,
            [wrongChoices[2]]: generated.feedbacks.choice3,
          };
          
          // 問題を作成
          await createQuestion({
            sessionId,
            wordId: word.id,
            sentenceContext: generated.sentence,
            sentenceJapanese: generated.sentenceJapanese,
            correctAnswer,
            choice1: shuffled[0],
            choice2: shuffled[1],
            choice3: shuffled[2],
            choice4: shuffled[3],
            feedbackCorrect: feedbackMap[correctAnswer],
            feedbackChoice1: feedbackMap[shuffled[0]],
            feedbackChoice2: feedbackMap[shuffled[1]],
            feedbackChoice3: feedbackMap[shuffled[2]],
            feedbackChoice4: feedbackMap[shuffled[3]],
          });
        }
        
        // 作成した問題を取得
        const questions = await getSessionQuestions(sessionId);
        
        // バックグラウンドで次のセッション用の問題を事前生成
        const { preGenerateNextSession } = await import("./pre-generate-helpers");
        preGenerateNextSession(userId).catch((error) => {
          console.error("[PreGenerate] Background generation failed:", error);
        });
        
        return {
          sessionId,
          theme: null,
          questions,
        };
      }
      
      // 事前生成がない場合は通常通り生成
      console.log(`[StartSession] No pre-generated session, generating now for user ${userId}`);

      // 新しいロジック: 5単語を選定
      // 1. 未出題単語を1つ選定
      // 2. アクティブリコール対象単語を2つ選定
      // 3. 品詞・難易度レベルで関連性の高い単語を2つ選定
      const wordsToStudy = await selectWordsForSession(userId);

      if (wordsToStudy.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "学習可能な単語が見つかりません",
        });
      }

      // セッションを作成
      const sessionId = await createSession({
        userId,
        theme: null, // 後でAIによるテーマ生成を実装
        status: "in_progress",
        totalQuestions: wordsToStudy.length,
        startedAt: new Date(),
      });

      // AIで10問を一括生成
      let generatedQuestions;
      try {
        generatedQuestions = await generateBatchQuestions(wordsToStudy);
      } catch (error) {
        console.error("[AI Batch] Failed to generate questions:", error);
        
        // フォールバック: 個別に問題を生成
        for (const word of wordsToStudy) {
          const correctAnswer = word.commonMeaning1;
          const sentenceContext = `This is an example sentence with <u>${word.word}</u>.`;
          const wrongChoices = ["選択肢A", "選択肢B", "選択肢C"];
          
          const allChoices = [correctAnswer, ...wrongChoices];
          const shuffled = allChoices.sort(() => Math.random() - 0.5);
          
          await createQuestion({
            sessionId,
            wordId: word.id,
            sentenceContext,
            correctAnswer,
            choice1: shuffled[0],
            choice2: shuffled[1],
            choice3: shuffled[2],
            choice4: shuffled[3],
          });
        }
        
        const questions = await getSessionQuestions(sessionId);
        return {
          sessionId,
          theme: null,
          questions,
        };
      }

      // 生成された問題をデータベースに保存
      for (let i = 0; i < generatedQuestions.length; i++) {
        const generated = generatedQuestions[i];
        const wordIndex = generated.wordIndex - 1; // 1-indexed to 0-indexed
        const word = wordsToStudy[wordIndex];
        
        if (!word) {
          console.error(`[AI Batch] Word not found for index ${wordIndex}`);
          continue;
        }
        
        const correctAnswer = word.commonMeaning1;
        const wrongChoices = generated.wrongChoices;
        
        // 選択肢をシャッフル
        const allChoices = [correctAnswer, ...wrongChoices];
        const shuffled = allChoices.sort(() => Math.random() - 0.5);
        
        // 各選択肢に対応するフィードバックを特定
        const feedbackMap: Record<string, string> = {
          [correctAnswer]: generated.feedbacks.correct,
          [wrongChoices[0]]: generated.feedbacks.choice1,
          [wrongChoices[1]]: generated.feedbacks.choice2,
          [wrongChoices[2]]: generated.feedbacks.choice3,
        };
        
        // 問題を作成
        await createQuestion({
          sessionId,
          wordId: word.id,
          sentenceContext: generated.sentence,
          sentenceJapanese: generated.sentenceJapanese,
          correctAnswer,
          choice1: shuffled[0],
          choice2: shuffled[1],
          choice3: shuffled[2],
          choice4: shuffled[3],
          feedbackCorrect: feedbackMap[correctAnswer],
          feedbackChoice1: feedbackMap[shuffled[0]],
          feedbackChoice2: feedbackMap[shuffled[1]],
          feedbackChoice3: feedbackMap[shuffled[2]],
          feedbackChoice4: feedbackMap[shuffled[3]],
        });
      }

      // 作成した問題を取得
      const questions = await getSessionQuestions(sessionId);

      // バックグラウンドで次のセッション用の問題を事前生成
      const { preGenerateNextSession } = await import("./pre-generate-helpers");
      preGenerateNextSession(userId).catch((error) => {
        console.error("[PreGenerate] Background generation failed:", error);
      });

      return {
        sessionId,
        theme: null,
        questions,
      };
    }),

    // 回答を記録する
    submitAnswer: protectedProcedure
      .input(
        z.object({
          questionId: z.number(),
          wordId: z.number(),
          userAnswer: z.string(),
          isCorrect: z.boolean(),
          confidenceLevel: z.enum(["not_learned", "uncertain", "perfect"]),
          answerTimeMs: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;

        // 問題の回答を記録（後で実装）
        // await updateQuestionAnswer(input.questionId, ...);

        // ユーザーの単語進捗を更新
        const now = new Date();
        let nextReviewAt: Date | null = null;

        // 忘却曲線に基づく次回復習日時の計算
        if (input.isCorrect) {
          if (input.confidenceLevel === "perfect") {
            // 完璧：7日後
            nextReviewAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          } else if (input.confidenceLevel === "uncertain") {
            // 微妙：3日後
            nextReviewAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
          } else {
            // 覚えてない：1日後
            nextReviewAt = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
          }
        } else {
          // 不正解の場合は即日復習
          nextReviewAt = new Date(now.getTime() + 1 * 60 * 60 * 1000); // 1時間後
        }

        await upsertUserWordProgress({
          userId,
          wordId: input.wordId,
          timesAnswered: 1, // 既存の値に+1する処理は後で実装
          timesCorrect: input.isCorrect ? 1 : 0,
          timesIncorrect: input.isCorrect ? 0 : 1,
          nextReviewAt,
          lastAnsweredAt: now,
          confidenceLevel: input.confidenceLevel,
        });

        return {
          success: true,
        };
      }),

    // セッションを終了して全体フィードバックを生成
    // セッションスコアを計算（高速）
    calculateSessionScore: protectedProcedure
      .input(
        z.object({
          sessionId: z.number(),
          results: z.array(
            z.object({
              word: z.string(),
              meaning: z.string(),
              isCorrect: z.boolean(),
              confidenceLevel: z.enum(["not_learned", "uncertain", "perfect"]),
            })
          ),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;

        // セッション終了前のユーザースコアを取得
        const { calculateUserScore } = await import("./score-helpers");
        const scoreBefore = await calculateUserScore(userId);

        // セッションの問題を取得
        const questions = await getSessionQuestions(input.sessionId);
        
        // 各問題の結果をデータベースに保存
        for (let i = 0; i < questions.length; i++) {
          const question = questions[i];
          const result = input.results[i];
          
          if (!result) continue;
          
          // nextReviewAtを計算（忘却曲線に基づく）
          const now = new Date();
          let nextReviewAt: Date;
          
          if (result.confidenceLevel === "perfect") {
            // 完璧：7日後
            nextReviewAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          } else if (result.confidenceLevel === "uncertain") {
            // 微妙：3日後
            nextReviewAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
          } else {
            // 覚えてない：1日後
            nextReviewAt = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
          }
          
          await upsertUserWordProgress({
            userId,
            wordId: question.wordId,
            timesAnswered: 1,
            timesCorrect: result.isCorrect ? 1 : 0,
            timesIncorrect: result.isCorrect ? 0 : 1,
            nextReviewAt,
            lastAnsweredAt: now,
            confidenceLevel: result.confidenceLevel,
          });
        }

        // セッション終了後のユーザースコアを取得
        const scoreAfter = await calculateUserScore(userId);

        return {
          scoreBefore,
          scoreAfter,
          scoreDiff: scoreAfter - scoreBefore,
        };
      }),

    // AIフィードバックを生成（時間がかかる）
    generateSessionFeedback: protectedProcedure
      .input(
        z.object({
          sessionId: z.number(),
          results: z.array(
            z.object({
              word: z.string(),
              meaning: z.string(),
              isCorrect: z.boolean(),
              confidenceLevel: z.enum(["not_learned", "uncertain", "perfect"]),
            })
          ),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // セッションの問題を取得
        const questions = await getSessionQuestions(input.sessionId);
        
        // 問題情報を整形
        const questionDetails = questions.map((q, idx) => ({
          word: q.word,
          sentenceContext: q.sentenceContext,
          correctAnswer: q.correctAnswer,
          userAnswer: input.results[idx]?.isCorrect ? undefined : input.results[idx]?.meaning,
        }));

        // AIで全体フィードバックを生成
        const { generateSessionFeedback } = await import("./ai-session-feedback");
        const feedback = await generateSessionFeedback(input.results, questionDetails);

        return {
          feedback,
        };
      }),
  }),

  // 初回レベルテスト
  initialTest: router({
    // テスト完了状況を確認
    checkStatus: protectedProcedure.query(async ({ ctx }) => {
      const userId = ctx.user.id;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const existing = await db
        .select()
        .from(userInitialTestResults)
        .where(eq(userInitialTestResults.userId, userId))
        .limit(1);
      
      return {
        completed: existing.length > 0,
        initialScore: existing[0]?.initialScore ?? null,
      };
    }),
    
    // テストを開始
    start: protectedProcedure.mutation(async ({ ctx }) => {
      const userId = ctx.user.id;
      
      // 既にテストを完了しているか確認
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const existing = await db
        .select()
        .from(userInitialTestResults)
        .where(eq(userInitialTestResults.userId, userId))
        .limit(1);
      
      if (existing.length > 0) {
        throw new Error("既に初回テストを完了しています");
      }
      
      // 30問を取得
      const { getInitialTestQuestions } = await import("./initial-test-helpers");
      const questions = await getInitialTestQuestions(userId);
      
      return {
        questions: questions.map((q) => ({
          id: q.id,
          sentenceContext: q.sentenceContext,
          sentenceJapanese: q.sentenceJapanese,
          choice1: q.choice1,
          choice2: q.choice2,
          choice3: q.choice3,
          choice4: q.choice4,
          correctAnswer: q.correctAnswer,
          difficultyScore: q.difficultyScore,
        })),
      };
    }),
    
    // 推定スコアに基づいて次の問題を取得
    getNextQuestion: protectedProcedure
      .input(
        z.object({
          estimatedScore: z.number(),
          answeredQuestionIds: z.array(z.number()),
        })
      )
      .query(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        const { getNextQuestionByScore } = await import("./initial-test-helpers");
        
        const question = await getNextQuestionByScore(
          userId,
          input.estimatedScore,
          input.answeredQuestionIds
        );
        
        if (!question) {
          throw new Error("問題が見つかりませんでした");
        }
        
        return question;
      }),
    
    // テスト結果を保存
    submit: protectedProcedure
      .input(
        z.object({
          answers: z.array(
            z.object({
              questionId: z.number(),
              selectedAnswer: z.string(),
              correctAnswer: z.string(),
              confidenceLevel: z.enum(["perfect", "uncertain", "forgot"]),
              difficultyScore: z.number(),
            })
          ),
          finalScore: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        
        // テスト結果を保存し、単語マーキングを実行
        const { saveInitialTestResult } = await import("./initial-test-helpers");
        await saveInitialTestResult(userId, input.finalScore, {
          answers: input.answers,
          timestamp: new Date().toISOString(),
        });
        
        return {
          success: true,
          initialScore: input.finalScore,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
