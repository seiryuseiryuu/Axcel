-- =============================================================================
-- RLS Helper Functions
-- =============================================================================

-- Helper to get current user ID
-- auth.uid() is standard, but sometimes we need to ensure it's not null
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper to check if user is instructor
CREATE OR REPLACE FUNCTION public.is_instructor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'instructor'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper to check if user is the instructor of a specific course
CREATE OR REPLACE FUNCTION public.is_course_instructor(course_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.courses
    WHERE id = course_id AND instructor_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper to check if user is enrolled in a specific course
CREATE OR REPLACE FUNCTION public.is_enrolled_student(course_uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.course_enrollments
    WHERE course_id = course_uid 
    AND student_id = auth.uid() 
    AND status IN ('active', 'completed')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Policies
-- =============================================================================

-- Profiles
-- Everyone can read their own profile
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT
USING (public.is_admin());

-- Instructors can read their students' profiles
CREATE POLICY "Instructors can read their students" ON public.profiles FOR SELECT
USING (
  public.is_instructor() AND EXISTS (
    SELECT 1 FROM public.course_enrollments ce
    JOIN public.courses c ON c.id = ce.course_id
    WHERE ce.student_id = profiles.id AND c.instructor_id = auth.uid()
  )
);

-- Admin can update role/profile
CREATE POLICY "Admins can update profiles" ON public.profiles FOR UPDATE
USING (public.is_admin());

-- Users can update some fields (avatar, bio) of their own
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE
USING (auth.uid() = id);


-- Courses
-- Admin can do everything
CREATE POLICY "Admins full access to courses" ON public.courses
USING (public.is_admin());

-- Instructors can read/write their own courses
CREATE POLICY "Instructors read own courses" ON public.courses FOR SELECT
USING (instructor_id = auth.uid());
CREATE POLICY "Instructors update own courses" ON public.courses FOR UPDATE
USING (instructor_id = auth.uid());
CREATE POLICY "Instructors insert own courses" ON public.courses FOR INSERT
WITH CHECK (instructor_id = auth.uid());

-- Students can read published courses they are enrolled in or public info
-- For now, read if enrolled or if status is published/draft?
-- Students see courses they are enrolled in.
CREATE POLICY "Students read enrolled courses" ON public.courses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.course_enrollments
    WHERE course_id = courses.id AND student_id = auth.uid()
  )
);


-- contents
-- Admin: all
CREATE POLICY "Admin full contents" ON public.contents
USING (public.is_admin());

-- Instructor: read/write own course contents
CREATE POLICY "Instructor manage course contents" ON public.contents
USING (public.is_course_instructor(course_id));

-- Student: read published contents in enrolled courses
CREATE POLICY "Student read contents" ON public.contents FOR SELECT
USING (
  is_published = true AND public.is_enrolled_student(course_id)
);


-- student_projects
-- Student: CRUD own
CREATE POLICY "Student manage own projects" ON public.student_projects
USING (student_id = auth.uid());

-- Instructor: Read projects of their course students
CREATE POLICY "Instructor read student projects" ON public.student_projects FOR SELECT
USING (
  public.is_course_instructor(course_id)
);

-- Admin: Read all
CREATE POLICY "Admin read all projects" ON public.student_projects FOR SELECT
USING (public.is_admin());


-- transcripts
-- Admin: all
CREATE POLICY "Admin manage transcripts" ON public.transcripts
USING (public.is_admin());

-- Instructor: Read own course transcripts
CREATE POLICY "Instructor read transcripts" ON public.transcripts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.contents c
    WHERE c.id = transcripts.content_id
    AND public.is_course_instructor(c.course_id)
  )
);

-- Student: Read transcripts for RAG (if exposed, or via API mostly)
-- If we expose transcripts directly to students:
CREATE POLICY "Student read transcripts" ON public.transcripts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.contents c
    WHERE c.id = transcripts.content_id
    AND public.is_enrolled_student(c.course_id)
  )
);
