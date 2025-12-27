-- =============================================
-- Prompt: YouTube Reply (Sistema 2)
-- Tabela: browser_platforms
-- Criado: 2025-12-27
--
-- COMPORTAMENTO HUMANIZADO:
-- 1. Navegar ao vídeo
-- 2. Assistir em velocidade 2x por 1-2 minutos
-- 3. Rolar e encontrar o comentário pai
-- 4. Curtir o comentário
-- 5. Responder ao comentário
-- =============================================

-- Primeiro, garantir que o registro existe
INSERT INTO browser_platforms (platform_name, is_active, comment_prompt)
VALUES ('youtube_reply', true, '')
ON CONFLICT (platform_name) DO NOTHING;

-- Atualizar o prompt de reply
UPDATE browser_platforms
SET comment_prompt = '# YouTube Comment Reply Task (HUMANIZED)

## CONTEXT:
You are helping a user reply to a YouTube comment. Act like a real human viewer.

## VIDEO INFO:
- Video URL: https://www.youtube.com/watch?v={{video_id}}
- Parent Comment ID to find: {{parent_comment_id}}
- Parent Comment Text Preview: {{parent_comment_preview}}
- Reply Text to Post: {{reply_text}}

## HUMANIZED BEHAVIOR (MANDATORY):

### Phase 1: Navigate and Watch (2-3 minutes)
1. Navigate to the video URL
2. Click on the video to ensure it starts playing
3. **SET PLAYBACK SPEED TO 2x:**
   - Click on the settings gear icon (bottom right of video)
   - Click "Playback speed"
   - Select "2" (2x speed)
4. **WATCH THE VIDEO for 60-90 seconds** (at 2x = 2-3 min real content)
   - Let it play naturally
   - Random mouse movements occasionally
   - Scroll down slightly after 30 seconds
5. Pause the video (click on it or press space)

### Phase 2: Find and Like Comment (1-2 minutes)
6. Scroll down to comments section
7. **SEARCH FOR THE PARENT COMMENT:**
   - Look for a comment containing: "{{parent_comment_preview}}"
   - Use Ctrl+F or browser find if needed
   - May need to click "Show more replies" or scroll
   - If "Sort by" is available, try "Newest first" if not found
8. **LIKE THE COMMENT:**
   - Find the thumbs up icon on the comment
   - Click to like it
   - Verify the like is registered (icon changes color)
9. Wait 2-3 seconds after liking

### Phase 3: Reply (1-2 minutes)
10. Click "Reply" button on the comment
11. Wait for reply box to appear
12. **TYPE THE REPLY NATURALLY:**
    - Type the reply text character by character (not paste)
    - Add small random delays between words (50-150ms)
    - Reply: {{reply_text}}
13. Wait 1-2 seconds after typing
14. Click the "Reply" or submit button
15. Wait for the reply to post (page refresh or reply appears)
16. Verify the reply was posted successfully

## CHECKLIST FOR RESPONSE:
Include a checklist of actions taken:
- [ ] Navigated to video
- [ ] Set playback speed to 2x
- [ ] Watched video for ~90 seconds
- [ ] Scrolled to comments
- [ ] Found target comment
- [ ] Liked the comment
- [ ] Clicked Reply
- [ ] Typed reply text naturally
- [ ] Submitted reply
- [ ] Verified reply posted

## RESPONSE FORMAT (return EXACTLY one):
- REPLY:SUCCESS - Reply posted successfully
- REPLY:SUCCESS|LIKE:FAILED - Reply posted but like failed
- COMMENT_NOT_FOUND - Could not find the parent comment
- COMMENTS_DISABLED - Comments are disabled on this video
- LOGIN_REQUIRED - Not logged into YouTube
- REPLY_BLOCKED - Reply was blocked or rejected
- ERROR: [specific reason]

## IMPORTANT NOTES:
- **DO NOT RUSH** - Take time between actions
- **WATCH FIRST** - Always watch before commenting (looks human)
- **LIKE BEFORE REPLY** - Shows engagement before responding
- If you cannot find the exact comment, try scrolling more or using search
- If like fails, still try to reply (reply is more important)',
    is_active = true
WHERE platform_name = 'youtube_reply';

-- Adicionar também um prompt para youtube_comment (Sistema 1) se não existir
INSERT INTO browser_platforms (platform_name, is_active, comment_prompt)
VALUES ('youtube_comment', true, '')
ON CONFLICT (platform_name) DO NOTHING;

UPDATE browser_platforms
SET comment_prompt = '# YouTube Direct Comment Task (HUMANIZED)

## CONTEXT:
You are posting a direct comment on a YouTube video. Act like a real human viewer.

## VIDEO INFO:
- Video URL: https://www.youtube.com/watch?v={{video_id}}
- Comment Text to Post: {{comment_text}}
- Channel Name: {{channel_name}}

## HUMANIZED BEHAVIOR (MANDATORY):

### Phase 1: Navigate and Watch (3-5 minutes)
1. Navigate to the video URL
2. Click on the video to ensure it starts playing
3. **SET PLAYBACK SPEED TO 2x:**
   - Click on the settings gear icon (bottom right of video)
   - Click "Playback speed"
   - Select "2" (2x speed)
4. **WATCH THE VIDEO for 2-3 minutes** (at 2x = 4-6 min real content)
   - Let it play naturally
   - Random mouse movements occasionally
   - Scroll down after 1 minute
5. **LIKE THE VIDEO** (thumbs up button below video)
6. Pause the video

### Phase 2: Post Comment (1-2 minutes)
7. Scroll to comments section
8. Click on "Add a comment..." input field
9. **TYPE THE COMMENT NATURALLY:**
    - Type character by character (not paste)
    - Add small random delays between words
    - Comment: {{comment_text}}
10. Wait 1-2 seconds after typing
11. Click "Comment" button to submit
12. Verify the comment was posted

## CHECKLIST FOR RESPONSE:
- [ ] Navigated to video
- [ ] Set playback speed to 2x
- [ ] Watched video for 2-3 minutes
- [ ] Liked the video
- [ ] Scrolled to comments
- [ ] Clicked comment box
- [ ] Typed comment naturally
- [ ] Submitted comment
- [ ] Verified comment posted

## RESPONSE FORMAT:
- COMMENT:SUCCESS - Comment posted successfully
- COMMENT:SUCCESS|LIKE:FAILED - Comment posted but like failed
- COMMENTS_DISABLED - Comments are disabled
- LOGIN_REQUIRED - Not logged into YouTube
- COMMENT_BLOCKED - Comment was blocked
- ERROR: [specific reason]'
WHERE platform_name = 'youtube_comment';
