/**
 * Where the friends' birthday video comes from.
 *
 *  - youtube: the id of an (unlisted) YouTube video, e.g. https://youtu.be/JEYFx23OvVo → 'JEYFx23OvVo'.
 *    It's embedded with YouTube's privacy-enhanced player inside the site's own frame.
 *  - set youtube to '' to play public/video/birthday.mp4 instead.
 */
export const BIRTHDAY_VIDEO = {
  youtube: 'JEYFx23OvVo',
  /** width / height of the video */
  aspect: 16 / 9,
}
