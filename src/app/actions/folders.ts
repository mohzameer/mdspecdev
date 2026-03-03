'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

async function requireUser() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    return { supabase, user };
}

// ──────────────────────────────────────────────
// createFolder
// ──────────────────────────────────────────────

export async function createFolder(
    projectId: string,
    name: string,
    parentFolderId: string | null,
    orgSlug: string,
    projectSlug: string
) {
    const { supabase, user } = await requireUser();
    if (!user) return { error: 'You must be logged in' };

    const baseSlug = generateSlug(name);
    if (!baseSlug) return { error: 'Invalid folder name' };

    // Ensure slug is unique within the same parent
    let slug = baseSlug;
    let attempt = 0;
    while (true) {
        const query = supabase
            .from('spec_folders')
            .select('id')
            .eq('project_id', projectId)
            .eq('slug', slug);

        if (parentFolderId) {
            query.eq('parent_folder_id', parentFolderId);
        } else {
            query.is('parent_folder_id', null);
        }

        const { data: existing } = await query.maybeSingle();
        if (!existing) break;
        attempt++;
        slug = `${baseSlug}-${attempt}`;
    }

    const { data, error } = await supabase
        .from('spec_folders')
        .insert({
            project_id: projectId,
            parent_folder_id: parentFolderId,
            name,
            slug,
        })
        .select()
        .single();

    if (error) return { error: error.message };

    revalidatePath(`/${orgSlug}/${projectSlug}`);
    return { success: true, folder: data };
}

// ──────────────────────────────────────────────
// renameFolder
// ──────────────────────────────────────────────

export async function renameFolder(
    folderId: string,
    name: string,
    orgSlug: string,
    projectSlug: string
) {
    const { supabase, user } = await requireUser();
    if (!user) return { error: 'You must be logged in' };

    const slug = generateSlug(name);
    if (!slug) return { error: 'Invalid folder name' };

    const { error } = await supabase
        .from('spec_folders')
        .update({ name, slug })
        .eq('id', folderId);

    if (error) return { error: error.message };

    revalidatePath(`/${orgSlug}/${projectSlug}`);
    return { success: true };
}

// ──────────────────────────────────────────────
// deleteFolder  (blocked if non-empty)
// ──────────────────────────────────────────────

export async function deleteFolder(
    folderId: string,
    orgSlug: string,
    projectSlug: string
) {
    const { supabase, user } = await requireUser();
    if (!user) return { error: 'You must be logged in' };

    // Check for specs inside
    const { data: specs } = await supabase
        .from('specs')
        .select('id')
        .eq('folder_id', folderId)
        .limit(1);

    if (specs && specs.length > 0) {
        return { error: 'Cannot delete a folder that contains specifications. Move or remove the specs first.' };
    }

    // Check for child folders
    const { data: children } = await supabase
        .from('spec_folders')
        .select('id')
        .eq('parent_folder_id', folderId)
        .limit(1);

    if (children && children.length > 0) {
        return { error: 'Cannot delete a folder that contains sub-folders. Remove the sub-folders first.' };
    }

    const { error } = await supabase
        .from('spec_folders')
        .delete()
        .eq('id', folderId);

    if (error) return { error: error.message };

    revalidatePath(`/${orgSlug}/${projectSlug}`);
    return { success: true };
}

// ──────────────────────────────────────────────
// moveSpecsToFolder  (bulk — folderId null → root)
// ──────────────────────────────────────────────

export async function moveSpecsToFolder(
    specIds: string[],
    folderId: string | null,
    orgSlug: string,
    projectSlug: string
) {
    const { supabase, user } = await requireUser();
    if (!user) return { error: 'You must be logged in' };
    if (!specIds.length) return { error: 'No specs selected' };

    const { error } = await supabase
        .from('specs')
        .update({ folder_id: folderId })
        .in('id', specIds);

    if (error) return { error: error.message };

    revalidatePath(`/${orgSlug}/${projectSlug}`);
    return { success: true };
}

// ──────────────────────────────────────────────
// moveFolderToFolder  (re-parent a folder)
// ──────────────────────────────────────────────

export async function moveFolderToFolder(
    folderId: string,
    newParentFolderId: string | null,
    orgSlug: string,
    projectSlug: string
) {
    const { supabase, user } = await requireUser();
    if (!user) return { error: 'You must be logged in' };

    // Prevent circular nesting: newParentFolderId must not be a descendant of folderId
    if (newParentFolderId) {
        let check: string | null = newParentFolderId;
        while (check) {
            if (check === folderId) {
                return { error: 'Cannot move a folder into one of its own sub-folders.' };
            }
            const { data: parentRow } = await supabase
                .from('spec_folders')
                .select('parent_folder_id')
                .eq('id', check)
                .single();
            const row = parentRow as { parent_folder_id: string | null } | null;
            check = row?.parent_folder_id ?? null;
        }
    }

    const { error } = await supabase
        .from('spec_folders')
        .update({ parent_folder_id: newParentFolderId })
        .eq('id', folderId);

    if (error) return { error: error.message };

    revalidatePath(`/${orgSlug}/${projectSlug}`);
    return { success: true };
}
