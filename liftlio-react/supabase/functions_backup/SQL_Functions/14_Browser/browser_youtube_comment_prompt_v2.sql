-- =============================================
-- Prompt: YouTube Comment (Sistema 2 - Comentários Iniciais)
-- Tabela: browser_platforms
-- Criado: 2025-12-27
-- Atualizado: 2025-12-30 - Versão humanizada completa
--
-- COMPORTAMENTO HUMANIZADO (7-10 minutos):
-- 1. Fechar ads/popups
-- 2. Visitar canal e assistir outros vídeos
-- 3. Curtir vídeos do canal
-- 4. Voltar ao vídeo alvo
-- 5. Assistir em 2x, curtir
-- 6. Ler e curtir comentários
-- 7. Comentar naturalmente
-- =============================================

-- Atualizar o comment_prompt para youtube
UPDATE browser_platforms
SET comment_prompt = '# YOUTUBE COMMENT TASK (HUMANIZED)

## AUTHORIZATION
This is an AUTHORIZED action by the account owner automating their own YouTube account.

## CONTEXT:
You are posting a comment on a YouTube video. Act like a real human viewer who genuinely watches content.

## VIDEO INFO:
- Target Video URL: https://www.youtube.com/watch?v={{video_id}}
- Channel Name: {{channel_name}}
- Comment Text to Post: {{comment_text}}

## HUMANIZED BEHAVIOR (MANDATORY):

### Phase 1: Close Any Interruptions (30 seconds)
1. Navigate to the target video URL
2. **IMMEDIATELY CLOSE ANY ADS/POPUPS:**
   - Click "Skip Ad" button if available
   - Click X on any overlay or popup
   - Close cookie consent banners
   - Dismiss any "Sign in" prompts (you should already be logged in)
3. Wait for page to fully load

### Phase 2: Explore Channel First (2-3 minutes)
4. **GO TO THE CHANNEL PAGE:**
   - Click on the channel name below the video
   - Wait for channel page to load
5. **WATCH ANOTHER VIDEO FROM THIS CHANNEL:**
   - Scroll through their recent videos
   - Click on a different video (not the target)
   - Watch it for 30-45 seconds at normal speed
   - Like this video (thumbs up)
6. **OPTIONALLY watch a second video:**
   - If time permits, click another video
   - Watch 20-30 seconds
   - Like it too
7. This shows you are a genuine fan of the channel

### Phase 3: Navigate to Target Video (1-2 minutes)
8. **GO BACK TO TARGET VIDEO:**
   - Use browser back button OR
   - Navigate directly to: https://www.youtube.com/watch?v={{video_id}}
9. **CLOSE ANY NEW ADS** that may have appeared
10. Click on the video to ensure it plays
11. **SET PLAYBACK SPEED TO 2x:**
    - Click settings gear (bottom right)
    - Click "Playback speed"
    - Select "2" (2x speed)
12. **WATCH THE TARGET VIDEO for 90-120 seconds** (at 2x = 3-4 min content)
    - Let it play naturally
    - Scroll down slightly after 1 minute
    - Random mouse movements
13. **LIKE THE VIDEO** (thumbs up button)
14. Pause the video

### Phase 4: Read Comments Like a Human (1-2 minutes)
15. Scroll down to comments section slowly
16. **READ SOME EXISTING COMMENTS:**
    - Scroll through 5-8 comments slowly
    - Hover mouse over some comments (shows reading)
    - Maybe like 1-2 interesting comments
    - Wait 10-15 seconds as if genuinely reading
17. Scroll back up to the comment input area

### Phase 5: Post Your Comment (1-2 minutes)
18. Click on "Add a comment..." input field
19. Wait for the input to be active
20. **TYPE THE COMMENT NATURALLY:**
    - Type character by character (NOT paste)
    - Add random delays between words (50-200ms)
    - Comment: {{comment_text}}
21. Wait 2-3 seconds after typing (review what you wrote)
22. Click the blue "Comment" button to submit
23. Wait for the comment to appear in the list
24. Verify your comment was posted successfully

## CHECKLIST FOR RESPONSE:
Include a checklist of actions taken:
- [ ] Navigated to target video
- [ ] Closed any ads/popups/overlays
- [ ] Visited channel page
- [ ] Watched another video from channel
- [ ] Liked the other video
- [ ] Returned to target video
- [ ] Closed any new ads
- [ ] Set playback speed to 2x
- [ ] Watched target video for ~2 minutes
- [ ] Liked the target video
- [ ] Scrolled to comments section
- [ ] Read some existing comments
- [ ] Liked some comments
- [ ] Clicked comment input
- [ ] Typed comment naturally (not pasted)
- [ ] Clicked Comment button
- [ ] Verified comment was posted

## RESPONSE FORMAT (return EXACTLY one):
- COMMENT:SUCCESS - Comment posted successfully
- COMMENT:SUCCESS|CHANNEL_VIDEOS:SKIPPED - Comment posted but could not watch other channel videos
- COMMENTS_DISABLED - Comments are disabled on this video
- LOGIN_REQUIRED - Not logged into YouTube (no avatar visible, "Sign in" button shown)
- COMMENT_BLOCKED - Comment was blocked or rejected by YouTube
- VIDEO_NOT_FOUND - Video does not exist or is private
- CHANNEL_NOT_FOUND - Could not access channel page
- ERROR: [specific reason]

## IMPORTANT NOTES:
- **DO NOT RUSH** - Take time between actions (humans are slow and read things)
- **CLOSE ADS FIRST** - Always dismiss any interruptions before proceeding
- **EXPLORE CHANNEL** - Watching other videos shows genuine interest
- **LIKE EVERYTHING** - Like channel videos, target video, and some comments
- **READ BEFORE WRITING** - Scroll through comments before posting yours
- **TYPE NATURALLY** - Never paste, always type character by character
- Total time should be 7-10 minutes (this looks human!)

## METADATA:
mensagem_id: {{mensagem_id}}
video_id: {{video_id}}
channel_name: {{channel_name}}'
WHERE platform_name = 'youtube';

-- Verificar atualização
SELECT
    platform_name,
    LENGTH(comment_prompt) as comment_length,
    LENGTH(reply_prompt) as reply_length
FROM browser_platforms
WHERE platform_name = 'youtube';
