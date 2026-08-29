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

            /*
             * Course documentId দিয়ে course খুঁজছি।
             */
            const course = await strapi
                .documents('api::course.course')
                .findOne({
                    documentId: courseId,
                    populate: {
                        lessons: true,
                    },
                });

            if (!course) {
                return ctx.notFound(
                    'Course পাওয়া যায়নি।'
                );
            }

            /*
             * Student শুধু published course-এ enroll করতে পারবে।
             */
            if (!course.publishedAt) {
                return ctx.badRequest(
                    'এই course এখনো published হয়নি।'
                );
            }

            /*
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
                return ctx.badRequest(
                    'তুমি আগে থেকেই এই course-এ enroll করা আছো।'
                );
            }

            /*
             * Enrollment create করার সময়ই course relation connect করছি।
             *
             * এখানে আলাদা করে পরে enrollment update করছি না।
             * এতে enrollment-এর course relation শুরু থেকেই
             * সঠিকভাবে save হবে।
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

            /*
             * Created enrollment আবার fetch করছি।
             * Course + lessons + completedLessons populate করছি।
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

            /*
             * Enrollment তৈরি হলেও course relation না থাকলে
             * success response দেব না।
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
         * Current student নির্দিষ্ট একটি course-এ enrolled কিনা
         * এবং থাকলে তার enrollment return করবে।
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

            /*
             * Course আগে validate করছি।
             */
            const course = await strapi
                .documents('api::course.course')
                .findOne({
                    documentId: courseId,
                });

            if (!course) {
                return ctx.notFound(
                    'Course পাওয়া যায়নি।'
                );
            }

            /*
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

            /*
             * Enrollment documentId দিয়ে enrollment খুঁজছি।
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

            /*
             * অন্য student অন্যের enrollment ব্যবহার করতে পারবে না।
             */
            if (enrollment.student?.id !== user.id) {
                return ctx.forbidden(
                    'এটা তোমার enrollment না।'
                );
            }

            /*
             * Enrollment-এর course relation অবশ্যই থাকতে হবে।
             */
            if (!enrollment.course?.documentId) {
                return ctx.badRequest(
                    'Enrollment-এর সাথে valid course পাওয়া যায়নি।'
                );
            }

            /*
             * Lesson validate করছি এবং lesson-এর course populate করছি।
             */
            const lesson = await strapi
                .documents('api::lesson.lesson')
                .findOne({
                    documentId: lessonId,
                    populate: {
                        course: true,
                    },
                });

            if (!lesson) {
                return ctx.notFound(
                    'Lesson পাওয়া যায়নি।'
                );
            }

            /*
             * Lesson অবশ্যই enrolled course-এর হতে হবে।
             *
             * documentId দিয়ে exact course match করছি।
             */
            if (
                !lesson.course?.documentId ||
                lesson.course.documentId !== enrollment.course.documentId
            ) {
                return ctx.forbidden(
                    'এই lesson তোমার enrolled course-এর অংশ নয়।'
                );
            }

            /*
             * Already completed কিনা check করছি।
             */
            const alreadyCompleted =
                enrollment.completedLessons?.some(
                    (completedLesson: any) =>
                        completedLesson.documentId === lesson.documentId
                );

            /*
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
                                set: uniqueCompletedLessonDocumentIds,
                            },
                        } as any,
                    });
            }

            /*
             * Updated enrollment আবার fetch করছি।
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

            const completedCount = completedLessons.filter(
                (item: any) =>
                    item.documentId &&
                    courseLessonDocumentIds.has(item.documentId)
            ).length;

            const percentage =
                totalLessons > 0
                    ? Math.round(
                          (completedCount / totalLessons) * 100
                      )
                    : 0;

            return {
                message: 'Lesson complete মার্ক করা হয়েছে.',
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

            /*
             * Enrollment + course + lessons + completedLessons
             * একসাথে populate করছি।
             */
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

            /*
             * Student শুধু নিজের enrollment-এর progress দেখতে পারবে।
             */
            if (enrollment.student?.id !== user.id) {
                return ctx.forbidden(
                    'এটা তোমার enrollment না।'
                );
            }

            /*
             * Course relation না থাকলে progress calculate করা সম্ভব না।
             */
            if (!enrollment.course?.documentId) {
                return ctx.badRequest(
                    'Enrollment-এর সাথে valid course পাওয়া যায়নি।'
                );
            }

            /*
             * Course-এর মোট lesson count।
             */
            const totalLessons =
                enrollment.course.lessons?.length || 0;

            /*
             * এই course-এর lesson documentId গুলো নিচ্ছি।
             */
            const courseLessonDocumentIds = new Set(
                (enrollment.course.lessons || [])
                    .map((lesson: any) => lesson.documentId)
                    .filter(Boolean)
            );

            /*
             * শুধু এই course-এর lesson যেগুলো complete হয়েছে
             * সেগুলো count করছি।
             *
             * অন্য course-এর lesson accidentally relation-এ থাকলেও
             * progress-এর মধ্যে count হবে না।
             */
            const completedCount =
                (enrollment.completedLessons || []).filter(
                    (completedLesson: any) =>
                        completedLesson.documentId &&
                        courseLessonDocumentIds.has(
                            completedLesson.documentId
                        )
                ).length;

            /*
             * Progress percentage calculate করছি।
             */
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