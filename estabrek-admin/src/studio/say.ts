/**
 * Words written in the three languages side by side ("عربي|English|עברית"), for the motion
 * studio's panels (scroll scenes, keyframes, triggers): each carries its own Hebrew, so they
 * never wait on the shared dictionary.
 */
import { adminLang } from "../lib/lang";

export const say = (t: string): string => {
  const [ar, en, he] = t.split("|");
  return { ar, en: en ?? ar, he: he ?? en ?? ar }[adminLang()];
};
