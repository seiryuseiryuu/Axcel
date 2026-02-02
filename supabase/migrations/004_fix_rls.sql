-- Enable RLS (Should be already enabled but good to ensure)
ALTER TABLE public.student_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_artifacts ENABLE ROW LEVEL SECURITY;

-- Policies for student_projects

-- Allow users to SELECT their own projects
CREATE POLICY "Users can view their own projects" ON public.student_projects
    FOR SELECT USING (auth.uid() = student_id);

-- Allow users to INSERT their own projects
CREATE POLICY "Users can insert their own projects" ON public.student_projects
    FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Allow users to UPDATE their own projects (if needed)
CREATE POLICY "Users can update their own projects" ON public.student_projects
    FOR UPDATE USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);

-- Allow users to DELETE their own projects
CREATE POLICY "Users can delete their own projects" ON public.student_projects
    FOR DELETE USING (auth.uid() = student_id);


-- Policies for generated_artifacts

-- Allow users to SELECT artifacts belonging to their projects
CREATE POLICY "Users can view their own artifacts" ON public.generated_artifacts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.student_projects
            WHERE student_projects.id = generated_artifacts.project_id
            AND student_projects.student_id = auth.uid()
        )
    );

-- Allow users to INSERT artifacts to their projects
CREATE POLICY "Users can insert artifacts to their projects" ON public.generated_artifacts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.student_projects
            WHERE student_projects.id = generated_artifacts.project_id
            AND student_projects.student_id = auth.uid()
        )
    );

-- Allow users to UPDATE artifacts of their projects
CREATE POLICY "Users can update their own artifacts" ON public.generated_artifacts
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.student_projects
            WHERE student_projects.id = generated_artifacts.project_id
            AND student_projects.student_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.student_projects
            WHERE student_projects.id = generated_artifacts.project_id
            AND student_projects.student_id = auth.uid()
        )
    );

-- Allow users to DELETE artifacts of their projects
CREATE POLICY "Users can delete their own artifacts" ON public.generated_artifacts
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.student_projects
            WHERE student_projects.id = generated_artifacts.project_id
            AND student_projects.student_id = auth.uid()
        )
    );
