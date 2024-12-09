import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { MEMBERS } from './members.js';
import { GALLERY_DATA } from './gallery-data.js';
import { COURSES } from './courses-data.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the correct path
dotenv.config({ path: path.join(__dirname, '../optopia-backend/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearTables() {
    try {
        console.log('Clearing existing data...');
        
        // Clear tables in reverse order of dependencies
        await supabase.from('course_teachers').delete().neq('course_id', '');
        await supabase.from('gallery_items').delete().neq('id', '');
        await supabase.from('courses').delete().neq('id', '');
        await supabase.from('members').delete().neq('id', '');
        
        console.log('All tables cleared successfully');
    } catch (error) {
        console.error('Error clearing tables:', error);
        throw error;
    }
}

async function migrateMembers() {
    try {
        console.log('Starting members migration...');
        
        // Transform and insert members
        const membersToInsert = MEMBERS.map(member => ({
            id: member.id,
            username: member.id,
            password: '1234',
            name_he: member.name.he,
            name_en: member.name.en,
            role_he: member.role.he,
            role_en: member.role.en,
            bio_he: member.bio.he,
            bio_en: member.bio.en,
            image_url: member.image,
            category: member.category || 'digital-artists',
            is_admin: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }));
        
        // Insert in batches of 10 to avoid rate limits
        const batchSize = 10;
        for (let i = 0; i < membersToInsert.length; i += batchSize) {
            const batch = membersToInsert.slice(i, i + batchSize);
            const { error: insertError } = await supabase
                .from('members')
                .insert(batch);
                
            if (insertError) {
                throw insertError;
            }
            
            console.log(`Migrated members batch ${i / batchSize + 1} of ${Math.ceil(membersToInsert.length / batchSize)}`);
        }
        
        console.log(`Total members migrated: ${membersToInsert.length}`);
        
    } catch (error) {
        console.error('Error migrating members:', error);
        throw error;
    }
}

async function migrateGalleryItems() {
    try {
        console.log('Starting gallery items migration...');
        
        // Transform and insert gallery items
        const galleryToInsert = GALLERY_DATA.map(item => ({
            id: item.id,
            artist_id: item.artist,
            title_he: item.title.he,
            title_en: item.title.en,
            description_he: item.description.he,
            description_en: item.description.en,
            image_url: item.src,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }));
        
        // Insert in batches of 10
        const batchSize = 10;
        for (let i = 0; i < galleryToInsert.length; i += batchSize) {
            const batch = galleryToInsert.slice(i, i + batchSize);
            const { error: insertError } = await supabase
                .from('gallery_items')
                .insert(batch);
                
            if (insertError) {
                throw insertError;
            }
            
            console.log(`Migrated gallery batch ${i / batchSize + 1} of ${Math.ceil(galleryToInsert.length / batchSize)}`);
        }
        
        console.log(`Total gallery items migrated: ${galleryToInsert.length}`);
        
    } catch (error) {
        console.error('Error migrating gallery items:', error);
        throw error;
    }
}

async function migrateCourses() {
    try {
        console.log('Starting courses migration...');
        
        for (const course of COURSES) {
            // Insert course
            const { error: courseError } = await supabase
                .from('courses')
                .insert({
                    id: course.id,
                    name_he: course.name.he,
                    name_en: course.name.en,
                    description_he: course.description.he,
                    description_en: course.description.en,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
            
            if (courseError) {
                throw courseError;
            }
            
            // Insert course-teacher relationships
            if (course.teachers && course.teachers.length > 0) {
                const teacherRelations = course.teachers.map(teacherId => ({
                    course_id: course.id,
                    teacher_id: teacherId
                }));
                
                const { error: teacherError } = await supabase
                    .from('course_teachers')
                    .insert(teacherRelations);
                
                if (teacherError) {
                    throw teacherError;
                }
            }
            
            console.log(`Migrated course: ${course.id}`);
        }
        
        console.log(`Total courses migrated: ${COURSES.length}`);
        
    } catch (error) {
        console.error('Error migrating courses:', error);
        throw error;
    }
}

async function migrate() {
    try {
        await clearTables();
        await migrateMembers();
        await migrateGalleryItems();
        await migrateCourses();
        console.log('Migration completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
migrate();
