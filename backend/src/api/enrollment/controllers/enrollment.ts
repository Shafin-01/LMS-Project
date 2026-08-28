import { factories } from '@strapi/strapi';

export default factories.createCoreController(
    'api::enrollment.enrollment',
    ({ strapi }) => ({
        /**
         * Student একটি published course-এ enroll করবে।
         */
        async enroll(ctx) {
            const user = ctx.state.user;

            if (!user) {
                return ctx.unauthorized(
                    'Login করা লাগবে enroll করার জন্য।'
                );
            }

            if (user.role?.name !== 'Student') {
                return ctx.forbidden(
                    'শুধুমাত্র Student course-এ enroll করতে পারবে।'
                );
            }

            const { courseId } = ctx.request.body || {};

            if (!courseId || typeof courseId !== 'string') {
                return ctx.badRequest(
                    'Valid courseId দিতে হবে।'
                );
            }

            /**
             * IMPORTANT:
             *
             * Strapi 5-এ published version explicitly চাইছি।
             *
             * আগের code-এ status না দেওয়ার কারণে draft version
             * ফিরে আসতে পারত এবং publishedAt null পাওয়া যাচ্ছিল।
             */
            const course = await strapi
                .documents('api::course.course')
                .findOne({
                    documentId: courseId,
                    status: 'published',
                    populate: {
                        lessons: true,
                    },
                });

            if (!course) {
                return ctx.notFound(
                    'Published course পাওয়া যায়নি।'
                );
            }

            /**
             * Safety check.
             */
            if (!course.publishedAt) {
                return ctx.badRequest(
                    'এই course এখনো published হয়নি।'
                );
            }

            /**
             * একই student একই course-এ একাধিকবার enroll করতে পারবে না।
             */
            const existingEnrollments = await strapi
                .documents('api::enrollment.enrollment')
                .findMany({
                    filters: {
                        course: {
                            documentId: {
                                $eq: course.documentId,
                            },
                        },
                        student: {
                            id: {
                                $eq: user.id,
                            },
                        },
                    },
                });

            if (existingEnrollments.length > 0) {
                /**
                 * Already enrolled হলে নতুন enrollment create না করে
                 * existing enrollment return করছি।
                 *
                 * এতে frontend বারবার enroll চাপলেও unnecessary error
                 * হবে না।
                 */
                const existingEnrollment = await strapi
                    .documents('api::enrollment.enrollment')
                    .findOne({
                        documentId:
                            existingEnrollments[0].documentId,
                        populate: {
                            student: true,
                            course: {
                                populate: {
                                    lessons: true,
                                },
                            },
                            completedLessons: true,
                        },
                    });

                return {
                    data: existingEnrollment,
                    alreadyEnrolled: true,
                };
            }

            /**
             * Enrollment create করছি এবং একইসাথে course relation connect করছি।
             *
             * Strapi 5 relation-এর জন্য documentId ব্যবহার করছি।
             */
            const enrollment = await strapi
                .documents('api::enrollment.enrollment')
                .create({
                    data: {
                        student: user.id,
                        course: {
                            connect: [course.documentId],
                        } as any,
                        enrolledAt: new Date(),
                    },
                });

            if (!enrollment?.documentId) {
                return ctx.internalServerError(
                    'Enrollment তৈরি করা যায়নি।'
                );
            }

            /**
             * Created enrollment আবার fetch করছি।
             */
            const createdEnrollment = await strapi
                .documents('api::enrollment.enrollment')
                .findOne({
                    documentId: enrollment.documentId,
                    populate: {
                        student: true,
                        course: {
                            populate: {
                                lessons: true,
                            },
                        },
                        completedLessons: true,
                    },
                });

            /**
             * Course relation না থাকলে success return করবো না।
             */
            if (
                !createdEnrollment ||
                !createdEnrollment.course?.documentId
            ) {
                return ctx.internalServerError(
                    'Enrollment তৈরি হয়েছে কিন্তু course relation পাওয়া যায়নি।'
                );
            }

            return {
                data: createdEnrollment,
                alreadyEnrolled: false,
            };
        },

        /**
         * Current student-এর সব enrollment।
         */
        async myEnrollments(ctx) {
            const user = ctx.state.user;

            if (!user) {
                return ctx.unauthorized(
                    'Login করা লাগবে।'
                );
            }

            if (user.role?.name !== 'Student') {
                return ctx.forbidden(
                    'শুধুমাত্র Student নিজের enrollments দেখতে পারবে।'
                );
            }

            const enrollments = await strapi
                .documents('api::enrollment.enrollment')
                .findMany({
                    filters: {
                        student: {
                            id: {
                                $eq: user.id,
                            },
                        },
                    },
                    populate: {
                        student: true,
                        course: {
                            populate: {
                                lessons: true,
                            },
                        },
                        completedLessons: true,
                    },
                });

            return {
                data: enrollments,
            };
        },

        /**
         * Current student নির্দিষ্ট একটি course-এ enrolled কিনা।
         */
        async myEnrollmentForCourse(ctx) {
            const user = ctx.state.user;

            if (!user) {
                return ctx.unauthorized(
                    'Login করা লাগবে।'
                );
            }

            if (user.role?.name !== 'Student') {
                return ctx.forbidden(
                    'শুধুমাত্র Student নিজের enrollment দেখতে পারবে।'
                );
            }

            const { courseId } = ctx.params;

            if (!courseId || typeof courseId !== 'string') {
                return ctx.badRequest(
                    'Valid courseId দিতে হবে।'
                );
            }

            /**
             * Published course validate করছি।
             */
            const course = await strapi
                .documents('api::course.course')
                .findOne({
                    documentId: courseId,
                    status: 'published',
                });

            if (!course) {
                return ctx.notFound(
                    'Published course পাওয়া যায়নি।'
                );
            }

            /**
             * Current student + exact course দিয়ে enrollment খুঁজছি।
             */
            const enrollments = await strapi
                .documents('api::enrollment.enrollment')
                .findMany({
                    filters: {
                        course: {
                            documentId: {
                                $eq: course.documentId,
                            },
                        },
                        student: {
                            id: {
                                $eq: user.id,
                            },
                        },
                    },
                    populate: {
                        student: true,
                        course: {
                            populate: {
                                lessons: true,
                            },
                        },
                        completedLessons: true,
                    },
                });

            const enrollment = enrollments[0] || null;

            return {
                data: enrollment,
            };
        },

        /**
         * Student একটি lesson complete হিসেবে mark করবে।
         */
        async completeLesson(ctx) {
            const user = ctx.state.user;

            if (!user) {
                return ctx.unauthorized(
                    'Login করা লাগবে।'
                );
            }

            if (user.role?.name !== 'Student') {
                return ctx.forbidden(
                    'শুধুমাত্র Student lesson complete করতে পারবে।'
                );
            }

            const { id } = ctx.params;
            const { lessonId } = ctx.request.body || {};

            if (!id || !lessonId) {
                return ctx.badRequest(
                    'enrollmentId এবং lessonId দুটোই দিতে হবে।'
                );
            }

            /**
             * Enrollment fetch করছি।
             */
            const enrollment = await strapi
                .documents('api::enrollment.enrollment')
                .findOne({
                    documentId: id,
                    populate: {
                        student: true,
                        course: {
                            populate: {
                                lessons: true,
                            },
                        },
                        completedLessons: true,
                    },
                });

            if (!enrollment) {
                return ctx.notFound(
                    'Enrollment পাওয়া যায়নি।'
                );
            }

            /**
             * অন্য student অন্যের enrollment ব্যবহার করতে পারবে না।
             */
            if (enrollment.student?.id !== user.id) {
                return ctx.forbidden(
                    'এটা তোমার enrollment না।'
                );
            }

            /**
             * Enrollment-এর course relation থাকতে হবে।
             */
            if (!enrollment.course?.documentId) {
                return ctx.badRequest(
                    'Enrollment-এর সাথে valid course পাওয়া যায়নি।'
                );
            }

            /**
             * Lesson validate করছি।
             *
             * Published lesson ছাড়া complete করা যাবে না।
             */
            const lesson = await strapi
                .documents('api::lesson.lesson')
                .findOne({
                    documentId: lessonId,
                    status: 'published',
                    populate: {
                        course: true,
                    },
                });

            if (!lesson) {
                return ctx.notFound(
                    'Published lesson পাওয়া যায়নি।'
                );
            }

            /**
             * Lesson অবশ্যই enrolled course-এর হতে হবে।
             */
            if (
                !lesson.course?.documentId ||
                lesson.course.documentId !==
                enrollment.course.documentId
            ) {
                return ctx.forbidden(
                    'এই lesson তোমার enrolled course-এর অংশ নয়।'
                );
            }

            /**
             * Already completed কিনা check করছি।
             */
            const alreadyCompleted =
                enrollment.completedLessons?.some(
                    (completedLesson: any) =>
                        completedLesson.documentId ===
                        lesson.documentId
                );

            /**
             * Already completed না হলে relation-এ lesson add করছি।
             */
            if (!alreadyCompleted) {
                const completedLessonDocumentIds =
                    enrollment.completedLessons
                        ?.map(
                            (completedLesson: any) =>
                                completedLesson.documentId
                        )
                        .filter(Boolean) || [];

                const uniqueCompletedLessonDocumentIds = [
                    ...new Set([
                        ...completedLessonDocumentIds,
                        lesson.documentId,
                    ]),
                ];

                await strapi
                    .documents('api::enrollment.enrollment')
                    .update({
                        documentId: id,
                        data: {
                            completedLessons: {
                                set:
                                    uniqueCompletedLessonDocumentIds,
                            },
                        } as any,
                    });
            }

            /**
             * Updated enrollment fetch করছি।
             */
            const updatedEnrollment = await strapi
                .documents('api::enrollment.enrollment')
                .findOne({
                    documentId: id,
                    populate: {
                        course: {
                            populate: {
                                lessons: true,
                            },
                        },
                        completedLessons: true,
                    },
                });

            const totalLessons =
                updatedEnrollment?.course?.lessons?.length || 0;

            const completedLessons =
                updatedEnrollment?.completedLessons || [];

            const courseLessonDocumentIds = new Set(
                (updatedEnrollment?.course?.lessons || [])
                    .map((item: any) => item.documentId)
                    .filter(Boolean)
            );

            const completedCount =
                completedLessons.filter(
                    (item: any) =>
                        item.documentId &&
                        courseLessonDocumentIds.has(
                            item.documentId
                        )
                ).length;

            const percentage =
                totalLessons > 0
                    ? Math.round(
                        (completedCount / totalLessons) * 100
                    )
                    : 0;

            return {
                message: 'Lesson complete মার্ক করা হয়েছে।',
                progress: {
                    totalLessons,
                    completedCount,
                    percentage,
                },
            };
        },

        /**
         * Current student-এর একটি enrollment-এর progress।
         */
        async getProgress(ctx) {
            const user = ctx.state.user;

            if (!user) {
                return ctx.unauthorized(
                    'Login করা লাগবে।'
                );
            }

            if (user.role?.name !== 'Student') {
                return ctx.forbidden(
                    'শুধুমাত্র Student নিজের progress দেখতে পারবে।'
                );
            }

            const { id } = ctx.params;

            if (!id) {
                return ctx.badRequest(
                    'enrollmentId দিতে হবে।'
                );
            }

            const enrollment = await strapi
                .documents('api::enrollment.enrollment')
                .findOne({
                    documentId: id,
                    populate: {
                        student: true,
                        completedLessons: true,
                        course: {
                            populate: {
                                lessons: true,
                            },
                        },
                    },
                });

            if (!enrollment) {
                return ctx.notFound(
                    'Enrollment পাওয়া যায়নি।'
                );
            }

            /**
             * Student শুধু নিজের enrollment-এর progress দেখতে পারবে।
             */
            if (enrollment.student?.id !== user.id) {
                return ctx.forbidden(
                    'এটা তোমার enrollment না।'
                );
            }

            if (!enrollment.course?.documentId) {
                return ctx.badRequest(
                    'Enrollment-এর সাথে valid course পাওয়া যায়নি।'
                );
            }

            const totalLessons =
                enrollment.course.lessons?.length || 0;

            const courseLessonDocumentIds = new Set(
                (enrollment.course.lessons || [])
                    .map((lesson: any) => lesson.documentId)
                    .filter(Boolean)
            );

            const completedCount =
                (enrollment.completedLessons || []).filter(
                    (completedLesson: any) =>
                        completedLesson.documentId &&
                        courseLessonDocumentIds.has(
                            completedLesson.documentId
                        )
                ).length;

            const percentage =
                totalLessons > 0
                    ? Math.round(
                        (completedCount / totalLessons) * 100
                    )
                    : 0;

            return {
                totalLessons,
                completedCount,
                percentage,
            };
        },
    })
);