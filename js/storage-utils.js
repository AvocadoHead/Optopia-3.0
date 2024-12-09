import { supabase } from './supabase-client.js'

export async function uploadImage(file, bucket, path) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `${path}/${fileName}`

    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file)

    if (error) {
        throw error
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath)

    return publicUrl
}

export async function deleteImage(path, bucket) {
    const { error } = await supabase.storage
        .from(bucket)
        .remove([path])

    if (error) {
        throw error
    }
}

// Storage buckets
export const STORAGE_BUCKETS = {
    PROFILE_IMAGES: 'profile-images',
    GALLERY_ITEMS: 'gallery-items'
}
