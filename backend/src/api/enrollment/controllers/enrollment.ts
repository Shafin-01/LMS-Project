import { factories } from '@strapi/strapi';

export default factories.createCoreController(
    'api::enrollment.enrollment',
    ({ strapi }) => ({

        async create(ctx) {
            return ctx.forbidden(
                'সরাসরি enrollment তৈরি করা যাবে না। "/enrollments/enroll" endpoint ব্যবহার করো।'
            );
        },

        async update(ctx) {
            return ctx.forbidden(
                'সরাসরি enrollment update করা যাবে না। "/enrollments/:id/complete-lesson" endpoint ব্যবহার করো।'
            );
        },

        async delete(ctx) {
            const user = ctx.state.user;
            if (!user || user.role?.name !== 'Admin') {
                return ctx.forbidden('শুধু Admin enrollment delete করতে পারবে।');
            }
            return super.delete(ctx);
        },

        async find(ctx) {
            const user = ctx.state.user;
            if (!user) {
                return ctx.unauthorized('Login করা বাধ্যতামূলক।');
            }
            const roleName = user.role?.name;

            if (roleName === 'Admin' || roleName === 'Content Manager') {
                return super.find(ctx);
            }

            if (roleName === 'Instructor') {
                const myCourses = await strapi.documents('api::course.course').findMany({
                    filters: { instructor: { id: { $eq: user.id } } },
                });
                const myCourseDocIds = myCourses.map((c: any) => c.documentId);
                ctx.query = {
                    ...ctx.query,
                    filters: {
                        ...(ctx.query?.filters as any || {}),
                        course: { documentId: { $in: myCourseDocIds } },
                    },
                };
                return super.find(ctx);
            }

            return ctx.forbidden('এই default endpoint তোমার জন্য না, "/enrollments/my-enrollments" ব্যবহার করো।');
        },

        /**
         * Student একটি published course-এ enroll করবে।
         */
        async enroll(ctx) {
            const user = ctx.state.user;

            if (!user) {
                return ctx.unauthorized('Login করা লাগবে enroll করার জন্য।');
            }

            if (user.role?.name !== 'Student') {
                return ctx.forbidden('শুধুমাত্র Student course-এ enroll করতে পারবে।');
            }

            const { courseId } = ctx.request.body || {};

            if (!courseId || typeof courseId !== 'string') {
                return ctx.badRequest('Valid courseId দিতে হবে।');
            }

            /*
             * প্রথমে draft version দিয়ে course-টা আদৌ আছে কিনা চেক করছি।
             */
            const course = await strapi
                .documents('api::course.course')
                .findOne({
                    documentId: courseId,
                    populate: { lessons: true },
                });

            if (!course) {
                return ctx.notFound('Course পাওয়া যায়নি।');
            }

            /*
             * publishedAt draft version-এ সবসময় null থাকে (Strapi v5-এর নিয়ম),
             * তাই publish হয়েছে কিনা বোঝার জন্য আলাদা করে status: 'published'
             * দিয়ে fetch করে দেখতে হবে।
             */
            const publishedCourse = await strapi
                .documents('api::course.course')
                .findOne({
                    documentId: courseId,
                    status: 'published',
                });

            if (!publishedCourse) {
                return ctx.badRequest('এই course এখনো published হয়নি।');
            }

            const existingEnrollments = await strapi
                .documents('api::enrollment.enrollment')
                .findMany({
                    filters: {
                        course: { documentId: { $eq: course.documentId } },
                        student: { id: { $eq: user.id } },
                    },
                });

            if (existingEnrollments.length > 0) {
                return ctx.badRequest('তুমি আগে থেকেই এই course-এ enroll করা আছো।');
            }

            const enrollment = await strapi
                .documents('api::enrollment.enrollment')
                .create({
                    data: {
                        student: user.id,
                        course: { connect: [course.documentId] } as any,
                        enrolledAt: new Date(),
                    },
                });

            if (!enrollment?.documentId) {
                return ctx.internalServerError('Enrollment তৈরি করা যায়নি।');
            }

            const createdEnrollment = await strapi
                .documents('api::enrollment.enrollment')
                .findOne({
                    documentId: enrollment.documentId,
                    populate: {
                        student: true,
                        course: { populate: { lessons: true } },
                        completedLessons: true,
                    },
                });

            if (!createdEnrollment || !createdEnrollment.course?.documentId) {
                return ctx.internalServerError('Enrollment তৈরি হয়েছে কিন্তু course relation পাওয়া যায়নি।');
            }

            return { data: createdEnrollment };
        },

        /**
         * Current student-এর সব enrollment।
         */
        async myEnrollments(ctx) {
            const user = ctx.state.user;

            if (!user) {
                return ctx.unauthorized('Login করা লাগবে।');
            }

            if (user.role?.name !== 'Student') {
                return ctx.forbidden('শুধুমাত্র Student নিজের enrollments দেখতে পারবে।');
            }

            const enrollments = await strapi
                .documents('api::enrollment.enrollment')
                .findMany({
                    filters: { student: { id: { $eq: user.id } } },
                    populate: {
                        student: true,
                        course: { populate: { lessons: true } },
                        completedLessons: true,
                    },
                });

            return { data: enrollments };
        },

        /**
         * Current student নির্দিষ্ট একটি course-এ enrolled কিনা।
         */
        async myEnrollmentForCourse(ctx) {
            const user = ctx.state.user;

            if (!user) {
                return ctx.unauthorized('Login করা লাগবে।');
            }

            if (user.role?.name !== 'Student') {
                return ctx.forbidden('শুধুমাত্র Student নিজের enrollment দেখতে পারবে।');
            }

            const { courseId } = ctx.params;

            if (!courseId || typeof courseId !== 'string') {
                return ctx.badRequest('Valid courseId দিতে হবে।');
            }

            const course = await strapi
                .documents('api::course.course')
                .findOne({ documentId: courseId });

            if (!course) {
                return ctx.notFound('Course পাওয়া যায়নি।');
            }

            const enrollments = await strapi
                .documents('api::enrollment.enrollment')
                .findMany({
                    filters: {
                        course: { documentId: { $eq: course.documentId } },
                        student: { id: { $eq: user.id } },
                    },
                    populate: {
                        student: true,
                        course: { populate: { lessons: true } },
                        completedLessons: true,
                    },
                });

            const enrollment = enrollments[0] || null;

            return { data: enrollment };
        },

        /**
         * Student একটি lesson complete হিসেবে mark করবে।
         */
        async completeLesson(ctx) {
            const user = ctx.state.user;

            if (!user) {
                return ctx.unauthorized('Login করা লাগবে।');
            }

            if (user.role?.name !== 'Student') {
                return ctx.forbidden('শুধুমাত্র Student lesson complete করতে পারবে।');
            }

            const { id } = ctx.params;
            const { lessonId } = ctx.request.body || {};

            if (!id || !lessonId) {
                return ctx.badRequest('enrollmentId এবং lessonId দুটোই দিতে হবে।');
            }

            const enrollment = await strapi
                .documents('api::enrollment.enrollment')
                .findOne({
                    documentId: id,
                    populate: {
                        student: true,
                        course: { populate: { lessons: true } },
                        completedLessons: true,
                    },
                });

            if (!enrollment) {
                return ctx.notFound('Enrollment পাওয়া যায়নি।');
            }

            if (enrollment.student?.id !== user.id) {
                return ctx.forbidden('এটা তোমার enrollment না।');
            }

            if (!enrollment.course?.documentId) {
                return ctx.badRequest('Enrollment-এর সাথে valid course পাওয়া যায়নি।');
            }

            const lesson = await strapi
                .documents('api::lesson.lesson')
                .findOne({
                    documentId: lessonId,
                    populate: { course: true },
                });

            if (!lesson) {
                return ctx.notFound('Lesson পাওয়া যায়নি।');
            }

            if (
                !lesson.course?.documentId ||
                lesson.course.documentId !== enrollment.course.documentId
            ) {
                return ctx.forbidden('এই lesson তোমার enrolled course-এর অংশ নয়।');
            }

            const alreadyCompleted =
                enrollment.completedLessons?.some(
                    (completedLesson: any) => completedLesson.documentId === lesson.documentId
                );

            if (!alreadyCompleted) {
                const completedLessonDocumentIds =
                    enrollment.completedLessons
                        ?.map((completedLesson: any) => completedLesson.documentId)
                        .filter(Boolean) || [];

                const uniqueCompletedLessonDocumentIds = [
                    ...new Set([...completedLessonDocumentIds, lesson.documentId]),
                ];

                await strapi
                    .documents('api::enrollment.enrollment')
                    .update({
                        documentId: id,
                        data: {
                            completedLessons: { set: uniqueCompletedLessonDocumentIds },
                        } as any,
                    });
            }

            const updatedEnrollment = await strapi
                .documents('api::enrollment.enrollment')
                .findOne({
                    documentId: id,
                    populate: {
                        course: { populate: { lessons: true } },
                        completedLessons: true,
                    },
                });

            const totalLessons = updatedEnrollment?.course?.lessons?.length || 0;
            const completedLessons = updatedEnrollment?.completedLessons || [];

            const courseLessonDocumentIds = new Set(
                (updatedEnrollment?.course?.lessons || [])
                    .map((item: any) => item.documentId)
                    .filter(Boolean)
            );

            const completedCount = completedLessons.filter(
                (item: any) => item.documentId && courseLessonDocumentIds.has(item.documentId)
            ).length;

            const percentage =
                totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

            return {
                message: 'Lesson complete মার্ক করা হয়েছে.',
                progress: { totalLessons, completedCount, percentage },
            };
        },

        /**
         * একটি নির্দিষ্ট enrollment-এর progress।
         * Student শুধু নিজেরটা, Admin/Content Manager যেকোনোটা,
         * Instructor শুধু নিজের course-এরটা দেখতে পারবে।
         */
        async getProgress(ctx) {
            const user = ctx.state.user;

            if (!user) {
                return ctx.unauthorized('Login করা লাগবে।');
            }

            const { id } = ctx.params;

            if (!id) {
                return ctx.badRequest('enrollmentId দিতে হবে।');
            }

            const enrollment = await strapi
                .documents('api::enrollment.enrollment')
                .findOne({
                    documentId: id,
                    populate: {
                        student: true,
                        completedLessons: true,
                        course: {
                            populate: { lessons: true, instructor: true },
                        },
                    },
                });

            if (!enrollment) {
                return ctx.notFound('Enrollment পাওয়া যায়নি।');
            }

            const roleName = user.role?.name;

            if (roleName === 'Student') {
                if (enrollment.student?.id !== user.id) {
                    return ctx.forbidden('এটা তোমার enrollment না।');
                }
            } else if (roleName === 'Admin' || roleName === 'Content Manager') {
                // platform-এর যেকোনো progress দেখতে পারবে
            } else if (roleName === 'Instructor') {
                if (enrollment.course?.instructor?.id !== user.id) {
                    return ctx.forbidden('এটা তোমার course-এর student না।');
                }
            } else {
                return ctx.forbidden('তোমার এই তথ্য দেখার permission নেই।');
            }

            if (!enrollment.course?.documentId) {
                return ctx.badRequest('Enrollment-এর সাথে valid course পাওয়া যায়নি।');
            }

            const totalLessons = enrollment.course.lessons?.length || 0;

            const courseLessonDocumentIds = new Set(
                (enrollment.course.lessons || [])
                    .map((lesson: any) => lesson.documentId)
                    .filter(Boolean)
            );

            const completedCount =
                (enrollment.completedLessons || []).filter(
                    (completedLesson: any) =>
                        completedLesson.documentId &&
                        courseLessonDocumentIds.has(completedLesson.documentId)
                ).length;

            const percentage =
                totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

            return {
                student: {
                    id: enrollment.student?.id,
                    username: enrollment.student?.username,
                },
                totalLessons,
                completedCount,
                percentage,
            };
        },

        /**
         * একটি course-এর সব student-এর progress list।
         */
        async courseProgress(ctx) {
            const user = ctx.state.user;

            if (!user) {
                return ctx.unauthorized('Login করা লাগবে।');
            }

            const roleName = user.role?.name;

            if (!['Admin', 'Content Manager', 'Instructor'].includes(roleName)) {
                return ctx.forbidden('তোমার এই তথ্য দেখার permission নেই।');
            }

            const { courseId } = ctx.params;

            if (!courseId) {
                return ctx.badRequest('courseId দিতে হবে।');
            }

            const course = await strapi
                .documents('api::course.course')
                .findOne({
                    documentId: courseId,
                    populate: { lessons: true, instructor: true },
                });

            if (!course) {
                return ctx.notFound('Course পাওয়া যায়নি।');
            }

            if (roleName === 'Instructor' && course.instructor?.id !== user.id) {
                return ctx.forbidden('এটা তোমার course না।');
            }

            const enrollments = await strapi
                .documents('api::enrollment.enrollment')
                .findMany({
                    filters: { course: { documentId: { $eq: course.documentId } } },
                    populate: { student: true, completedLessons: true },
                });

            const totalLessons = course.lessons?.length || 0;
            const courseLessonDocumentIds = new Set(
                (course.lessons || []).map((lesson: any) => lesson.documentId).filter(Boolean)
            );

            const data = enrollments.map((enrollment: any) => {
                const completedCount = (enrollment.completedLessons || []).filter(
                    (item: any) => item.documentId && courseLessonDocumentIds.has(item.documentId)
                ).length;

                const percentage =
                    totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

                return {
                    student: {
                        id: enrollment.student?.id,
                        username: enrollment.student?.username,
                        email: enrollment.student?.email,
                    },
                    totalLessons,
                    completedCount,
                    percentage,
                };
            });

            return { data };
        },

    })
);