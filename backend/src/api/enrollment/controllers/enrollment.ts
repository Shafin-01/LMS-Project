import { factories } from '@strapi/strapi';
import { sanitizeUser } from '../../../utils/sanitize-user';

export default factories.createCoreController(
    'api::enrollment.enrollment',
    ({ strapi }) => {


        const getPublishedLessons = async (courseDocumentId: string) => {
            if (!courseDocumentId) return [];
            const lessons = await strapi.documents('api::lesson.lesson').findMany({
                status: 'published',
                filters: { course: { documentId: { $eq: courseDocumentId } } },
                fields: ['Title'],
            });
            return lessons.map((lesson: any) => ({
                id: lesson.id,
                documentId: lesson.documentId,
                Title: lesson.Title,
            }));
        };

        
        const withPublishedCourseData = async (course: any) => {
            if (!course) return course;
            const [publishedInfo, lessons] = await Promise.all([
                strapi.documents('api::course.course').findOne({
                    documentId: course.documentId,
                    status: 'published',
                    fields: ['Title', 'Description'],
                }),
                getPublishedLessons(course.documentId),
            ]);
            return {
                ...course,
                Title: (publishedInfo as any)?.Title ?? course.Title,
                Description: (publishedInfo as any)?.Description ?? course.Description,
                lessons,
            };
        };

        return {

        async create(ctx) {
            return ctx.forbidden(
                'Enrollments cannot be created directly. Use the "/enrollments/enroll" endpoint.'
            );
        },

        async update(ctx) {
            return ctx.forbidden(
                'Enrollments cannot be updated directly. Use the "/enrollments/:id/complete-lesson" endpoint.'
            );
        },

        async delete(ctx) {
            const user = ctx.state.user;
            if (!user || user.role?.name !== 'Admin') {
                return ctx.forbidden('Only an Admin can delete enrollments.');
            }
            return super.delete(ctx);
        },

        async find(ctx) {
            const user = ctx.state.user;
            if (!user) {
                return ctx.unauthorized('Login is required.');
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

            return ctx.forbidden('This default endpoint is not for you — use "/enrollments/my-enrollments" instead.');
        },

        /**
         * A student enrolls in a published course.
         */
        async enroll(ctx) {
            const user = ctx.state.user;

            if (!user) {
                return ctx.unauthorized('You must be logged in to enroll.');
            }

            if (user.role?.name !== 'Student') {
                return ctx.forbidden('Only students can enroll in courses.');
            }

            const { courseId } = ctx.request.body || {};

            if (!courseId || typeof courseId !== 'string') {
                return ctx.badRequest('A valid courseId is required.');
            }

            const course = await strapi
                .documents('api::course.course')
                .findOne({
                    documentId: courseId,
                    populate: { lessons: true },
                });

            if (!course) {
                return ctx.notFound('Course not found.');
            }

            const publishedCourse = await strapi
                .documents('api::course.course')
                .findOne({
                    documentId: courseId,
                    status: 'published',
                });

            if (!publishedCourse) {
                return ctx.badRequest('This course has not been published yet.');
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
                return ctx.badRequest('You are already enrolled in this course.');
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
                return ctx.internalServerError('Failed to create enrollment.');
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
                return ctx.internalServerError('Enrollment was created but the course relation could not be found.');
            }

            return {
                data: {
                    ...createdEnrollment,
                    student: sanitizeUser(createdEnrollment.student),
                    course: await withPublishedCourseData(createdEnrollment.course),
                },
            };
        },

        /**
         * All enrollments for the current student.
         */
        async myEnrollments(ctx) {
            const user = ctx.state.user;

            if (!user) {
                return ctx.unauthorized('You must be logged in.');
            }

            if (user.role?.name !== 'Student') {
                return ctx.forbidden('Only students can view their own enrollments.');
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

            const sanitizedEnrollments = await Promise.all(
                enrollments.map(async (enrollment: any) => ({
                    ...enrollment,
                    student: sanitizeUser(enrollment.student),
                    course: await withPublishedCourseData(enrollment.course),
                }))
            );

            return { data: sanitizedEnrollments };
        },

        /**
         * Whether the current student is enrolled in a specific course.
         */
        async myEnrollmentForCourse(ctx) {
            const user = ctx.state.user;

            if (!user) {
                return ctx.unauthorized('You must be logged in.');
            }

            if (user.role?.name !== 'Student') {
                return ctx.forbidden('Only students can view their own enrollment.');
            }

            const { courseId } = ctx.params;

            if (!courseId || typeof courseId !== 'string') {
                return ctx.badRequest('A valid courseId is required.');
            }

            const course = await strapi
                .documents('api::course.course')
                .findOne({ documentId: courseId });

            if (!course) {
                return ctx.notFound('Course not found.');
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

            const enrollment: any = enrollments[0] || null;

            return {
                data: enrollment
                    ? {
                          ...enrollment,
                          student: sanitizeUser(enrollment.student),
                          course: await withPublishedCourseData(enrollment.course),
                      }
                    : null,
            };
        },

        /**
         * A student marks a lesson as complete.
         */
        async completeLesson(ctx) {
            const user = ctx.state.user;

            if (!user) {
                return ctx.unauthorized('You must be logged in.');
            }

            if (user.role?.name !== 'Student') {
                return ctx.forbidden('Only students can mark lessons as complete.');
            }

            const { id } = ctx.params;
            const { lessonId } = ctx.request.body || {};

            if (!id || !lessonId) {
                return ctx.badRequest('Both enrollmentId and lessonId are required.');
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
                return ctx.notFound('Enrollment not found.');
            }

            if (enrollment.student?.id !== user.id) {
                return ctx.forbidden('This is not your enrollment.');
            }

            if (!enrollment.course?.documentId) {
                return ctx.badRequest('No valid course found for this enrollment.');
            }

            const lesson = await strapi
                .documents('api::lesson.lesson')
                .findOne({
                    documentId: lessonId,
                    status: 'published',
                    populate: { course: true },
                });

            if (!lesson) {
                return ctx.notFound('Lesson not found.');
            }

            if (
                !lesson.course?.documentId ||
                lesson.course.documentId !== enrollment.course.documentId
            ) {
                return ctx.forbidden('This lesson is not part of your enrolled course.');
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

            const updatedEnrollment: any = await strapi
                .documents('api::enrollment.enrollment')
                .findOne({
                    documentId: id,
                    populate: {
                        course: true,
                        completedLessons: true,
                    },
                });

            const publishedLessons = await getPublishedLessons(updatedEnrollment?.course?.documentId);
            const totalLessons = publishedLessons.length;
            const completedLessons = updatedEnrollment?.completedLessons || [];

            const courseLessonDocumentIds = new Set(
                publishedLessons.map((item: any) => item.documentId).filter(Boolean)
            );

            const completedCount = completedLessons.filter(
                (item: any) => item.documentId && courseLessonDocumentIds.has(item.documentId)
            ).length;

  
            const percentage =
                totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 100;

            return {
                message: 'Lesson marked as complete.',
                progress: { totalLessons, completedCount, percentage },
            };
        },

        
        async getProgress(ctx) {
            const user = ctx.state.user;

            if (!user) {
                return ctx.unauthorized('You must be logged in.');
            }

            const { id } = ctx.params;

            if (!id) {
                return ctx.badRequest('enrollmentId is required.');
            }

            const enrollment: any = await strapi
                .documents('api::enrollment.enrollment')
                .findOne({
                    documentId: id,
                    populate: {
                        student: true,
                        completedLessons: true,
                        course: {
                            populate: { instructor: true },
                        },
                    },
                });

            if (!enrollment) {
                return ctx.notFound('Enrollment not found.');
            }

            const roleName = user.role?.name;

            if (roleName === 'Student') {
                if (enrollment.student?.id !== user.id) {
                    return ctx.forbidden('This is not your enrollment.');
                }
            } else if (roleName === 'Admin' || roleName === 'Content Manager') {
                // Can view any progress on the platform
            } else if (roleName === 'Instructor') {
                if (enrollment.course?.instructor?.id !== user.id) {
                    return ctx.forbidden('This is not a student in your course.');
                }
            } else {
                return ctx.forbidden('You do not have permission to view this information.');
            }

            if (!enrollment.course?.documentId) {
                return ctx.badRequest('No valid course found for this enrollment.');
            }

            const publishedLessons = await getPublishedLessons(enrollment.course.documentId);
            const totalLessons = publishedLessons.length;

            const courseLessonDocumentIds = new Set(
                publishedLessons.map((lesson: any) => lesson.documentId).filter(Boolean)
            );

            const completedCount =
                (enrollment.completedLessons || []).filter(
                    (completedLesson: any) =>
                        completedLesson.documentId &&
                        courseLessonDocumentIds.has(completedLesson.documentId)
                ).length;

            const percentage =
                totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 100;
            const completedLessonsList = (enrollment.completedLessons || [])
                .filter(
                    (completedLesson: any) =>
                        completedLesson.documentId &&
                        courseLessonDocumentIds.has(completedLesson.documentId)
                )
                .map((completedLesson: any) => ({
                    id: completedLesson.id,
                    documentId: completedLesson.documentId,
                }));

            return {
                student: {
                    id: enrollment.student?.id,
                    username: enrollment.student?.username,
                },
                totalLessons,
                completedCount,
                percentage,
                completedLessons: completedLessonsList,
            };
        },

        /**
         * The progress list for every student in a course.
         */
        async courseProgress(ctx) {
            const user = ctx.state.user;

            if (!user) {
                return ctx.unauthorized('You must be logged in.');
            }

            const roleName = user.role?.name;

            if (!['Admin', 'Content Manager', 'Instructor'].includes(roleName)) {
                return ctx.forbidden('You do not have permission to view this information.');
            }

            const { courseId } = ctx.params;

            if (!courseId) {
                return ctx.badRequest('courseId is required.');
            }

            const course = await strapi
                .documents('api::course.course')
                .findOne({
                    documentId: courseId,
                    populate: { instructor: true },
                });

            if (!course) {
                return ctx.notFound('Course not found.');
            }

            if (roleName === 'Instructor' && course.instructor?.id !== user.id) {
                return ctx.forbidden('This is not your course.');
            }

            const enrollments = await strapi
                .documents('api::enrollment.enrollment')
                .findMany({
                    filters: { course: { documentId: { $eq: course.documentId } } },
                    populate: { student: true, completedLessons: true },
                });

            const publishedLessons = await getPublishedLessons(course.documentId);
            const totalLessons = publishedLessons.length;
            const courseLessonDocumentIds = new Set(
                publishedLessons.map((lesson: any) => lesson.documentId).filter(Boolean)
            );

            const data = enrollments.map((enrollment: any) => {
                const completedCount = (enrollment.completedLessons || []).filter(
                    (item: any) => item.documentId && courseLessonDocumentIds.has(item.documentId)
                ).length;

                const percentage =
                    totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 100;

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

        };
    }
);