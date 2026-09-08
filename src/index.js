/**
 * Hennie's Photos - Cloudflare Workers Backend
 * Handles events, photos, and orders
 */

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response('OK', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    };

    try {
      // GET /events - Retrieve all events with photos
      if (path === '/events' && request.method === 'GET') {
        const events = await env.DB.prepare(
          'SELECT * FROM events ORDER BY created_at DESC'
        ).all();

        const eventsWithPhotos = await Promise.all(
          events.results.map(async (event) => {
            const photos = await env.DB.prepare(
              'SELECT id, src, price FROM photos WHERE event_id = ? ORDER BY created_at ASC'
            ).bind(event.id).all();

            return {
              ...event,
              photos: photos.results || [],
            };
          })
        );

        return new Response(
          JSON.stringify({ events: eventsWithPhotos }),
          { headers: corsHeaders }
        );
      }

      // POST /events - Create a new event
      if (path === '/events' && request.method === 'POST') {
        const { id, name, date } = await request.json();

        if (!id || !name) {
          return new Response(
            JSON.stringify({ error: 'Missing id or name' }),
            { status: 400, headers: corsHeaders }
          );
        }

        await env.DB.prepare(
          'INSERT INTO events (id, name, date, created_at) VALUES (?, ?, ?, datetime("now"))'
        ).bind(id, name, date || '').run();

        return new Response(
          JSON.stringify({ success: true, id }),
          { headers: corsHeaders }
        );
      }

      // POST /photos - Upload photos to an event
      if (path === '/photos' && request.method === 'POST') {
        const formData = await request.formData();
        const eventId = formData.get('eventId');
        const files = formData.getAll('photos');

        if (!eventId || !files.length) {
          return new Response(
            JSON.stringify({ error: 'Missing eventId or photos' }),
            { status: 400, headers: corsHeaders }
          );
        }

        // Verify event exists
        const event = await env.DB.prepare(
          'SELECT id FROM events WHERE id = ?'
        ).bind(eventId).first();

        if (!event) {
          return new Response(
            JSON.stringify({ error: 'Event not found' }),
            { status: 404, headers: corsHeaders }
          );
        }

        // Process each file
        const uploadedPhotos = [];
        for (const file of files) {
          const buffer = await file.arrayBuffer();
          const photoId = 'PHOTO_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

          // Store in R2 (Cloudflare object storage)
          const key = `${eventId}/${photoId}`;
          await env.R2_BUCKET.put(key, buffer, {
            httpMetadata: { contentType: file.type },
          });

          // Generate public URL
          const photoUrl = `${env.R2_PUBLIC_URL}/${key}`;

          // Save photo metadata to database
          await env.DB.prepare(
            'INSERT INTO photos (id, event_id, src, price, created_at) VALUES (?, ?, ?, ?, datetime("now"))'
          ).bind(photoId, eventId, photoUrl, 0).run();

          uploadedPhotos.push({ id: photoId, src: photoUrl });
        }

        return new Response(
          JSON.stringify({ success: true, photos: uploadedPhotos }),
          { headers: corsHeaders }
        );
      }

      // DELETE /events/:id - Delete an event and its photos
      if (path.startsWith('/events/') && request.method === 'DELETE') {
        const id = decodeURIComponent(path.split('/events/')[1]);

        // Get all photos for this event
        const photos = await env.DB.prepare(
          'SELECT id FROM photos WHERE event_id = ?'
        ).bind(id).all();

        // Delete from R2
        for (const photo of photos.results || []) {
          const key = `${id}/${photo.id}`;
          await env.R2_BUCKET.delete(key);
        }

        // Delete from database
        await env.DB.prepare('DELETE FROM photos WHERE event_id = ?').bind(id).run();
        await env.DB.prepare('DELETE FROM events WHERE id = ?').bind(id).run();

        return new Response(
          JSON.stringify({ success: true }),
          { headers: corsHeaders }
        );
      }

      // 404 for unknown routes
      return new Response(
        JSON.stringify({ error: 'Not found' }),
        { status: 404, headers: corsHeaders }
      );
    } catch (error) {
      console.error('Error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: corsHeaders }
      );
    }
  },
};
