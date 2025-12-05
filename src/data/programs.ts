import { TVProgram } from '@/types';

// Helper to create program times for today
function createTime(hours: number, minutes: number = 0): Date {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

// Sample program data - in production this would come from an API
export const samplePrograms: TVProgram[] = [
  // France 24
  { id: 'p1', channelId: '1', title: 'World News', startTime: createTime(6), endTime: createTime(7), category: 'news', isLive: true },
  { id: 'p2', channelId: '1', title: 'Focus', startTime: createTime(7), endTime: createTime(7, 30), category: 'news' },
  { id: 'p3', channelId: '1', title: 'The Debate', startTime: createTime(7, 30), endTime: createTime(8), category: 'news' },
  { id: 'p4', channelId: '1', title: 'Paris Direct', startTime: createTime(8), endTime: createTime(9), category: 'news' },
  { id: 'p5', channelId: '1', title: 'Reporters', startTime: createTime(9), endTime: createTime(10), category: 'documentary' },
  { id: 'p6', channelId: '1', title: 'Business Daily', startTime: createTime(10), endTime: createTime(11), category: 'news' },
  { id: 'p7', channelId: '1', title: 'French Connection', startTime: createTime(11), endTime: createTime(12), category: 'lifestyle' },
  { id: 'p8', channelId: '1', title: 'Tech 24', startTime: createTime(12), endTime: createTime(13), category: 'technology' },
  { id: 'p9', channelId: '1', title: 'World News', startTime: createTime(13), endTime: createTime(14), category: 'news' },
  { id: 'p10', channelId: '1', title: 'Perspective', startTime: createTime(14), endTime: createTime(15), category: 'documentary' },

  // Russian channels - Первый канал
  { id: 'ru_p1', channelId: 'ru1', title: 'Доброе утро', startTime: createTime(5), endTime: createTime(9), category: 'entertainment' },
  { id: 'ru_p2', channelId: 'ru1', title: 'Новости', startTime: createTime(9), endTime: createTime(9, 15), category: 'news', isLive: true },
  { id: 'ru_p3', channelId: 'ru1', title: 'Давай поженимся!', startTime: createTime(9, 15), endTime: createTime(10), category: 'entertainment' },
  { id: 'ru_p4', channelId: 'ru1', title: 'Жить здорово!', startTime: createTime(10), endTime: createTime(11), category: 'lifestyle' },
  { id: 'ru_p5', channelId: 'ru1', title: 'Модный приговор', startTime: createTime(11), endTime: createTime(12), category: 'lifestyle' },
  { id: 'ru_p6', channelId: 'ru1', title: 'Новости', startTime: createTime(12), endTime: createTime(12, 15), category: 'news', isLive: true },
  { id: 'ru_p7', channelId: 'ru1', title: 'Время покажет', startTime: createTime(12, 15), endTime: createTime(15), category: 'talk-show' },
  { id: 'ru_p8', channelId: 'ru1', title: 'Новости', startTime: createTime(15), endTime: createTime(15, 15), category: 'news', isLive: true },
  { id: 'ru_p9', channelId: 'ru1', title: 'Давай поженимся!', startTime: createTime(15, 15), endTime: createTime(16), category: 'entertainment' },
  { id: 'ru_p10', channelId: 'ru1', title: 'Мужское / Женское', startTime: createTime(16), endTime: createTime(18), category: 'talk-show' },
  { id: 'ru_p11', channelId: 'ru1', title: 'Вечерние новости', startTime: createTime(18), endTime: createTime(18, 45), category: 'news', isLive: true },
  { id: 'ru_p12', channelId: 'ru1', title: 'Пусть говорят', startTime: createTime(18, 45), endTime: createTime(20), category: 'talk-show' },
  { id: 'ru_p13', channelId: 'ru1', title: 'Время', startTime: createTime(21), endTime: createTime(21, 30), category: 'news', isLive: true },
  { id: 'ru_p14', channelId: 'ru1', title: 'Вечерний Ургант', startTime: createTime(23, 30), endTime: createTime(0), category: 'entertainment' },

  // Россия 24
  { id: 'ru24_p1', channelId: 'ru7', title: 'Утро России 24', startTime: createTime(5), endTime: createTime(9), category: 'news', isLive: true },
  { id: 'ru24_p2', channelId: 'ru7', title: 'Вести', startTime: createTime(9), endTime: createTime(10), category: 'news', isLive: true },
  { id: 'ru24_p3', channelId: 'ru7', title: 'Документальный фильм', startTime: createTime(10), endTime: createTime(11), category: 'documentary' },
  { id: 'ru24_p4', channelId: 'ru7', title: 'Вести', startTime: createTime(11), endTime: createTime(12), category: 'news', isLive: true },
  { id: 'ru24_p5', channelId: 'ru7', title: '60 минут', startTime: createTime(12), endTime: createTime(14), category: 'talk-show' },
  { id: 'ru24_p6', channelId: 'ru7', title: 'Вести', startTime: createTime(14), endTime: createTime(15), category: 'news', isLive: true },
  { id: 'ru24_p7', channelId: 'ru7', title: 'Прямой эфир', startTime: createTime(15), endTime: createTime(17), category: 'talk-show' },
  { id: 'ru24_p8', channelId: 'ru7', title: 'Вечерние новости', startTime: createTime(17), endTime: createTime(18), category: 'news', isLive: true },
  { id: 'ru24_p9', channelId: 'ru7', title: 'Итоги дня', startTime: createTime(23), endTime: createTime(23, 30), category: 'news' },

  // Матч ТВ
  { id: 'match_p1', channelId: 'ru9', title: 'Все на Матч!', startTime: createTime(7), endTime: createTime(9), category: 'sports' },
  { id: 'match_p2', channelId: 'ru9', title: 'Футбол. Обзор тура', startTime: createTime(9), endTime: createTime(10), category: 'sports' },
  { id: 'match_p3', channelId: 'ru9', title: 'Хоккей. КХЛ', startTime: createTime(10), endTime: createTime(12, 30), category: 'sports', isLive: true },
  { id: 'match_p4', channelId: 'ru9', title: 'Смешанные единоборства', startTime: createTime(12, 30), endTime: createTime(14), category: 'sports' },
  { id: 'match_p5', channelId: 'ru9', title: 'Футбол. Прямая трансляция', startTime: createTime(19), endTime: createTime(21), category: 'sports', isLive: true },
  { id: 'match_p6', channelId: 'ru9', title: 'Все на футбол!', startTime: createTime(21), endTime: createTime(22), category: 'sports' },

  // DW English
  { id: 'dw_p1', channelId: '2', title: 'DW News', startTime: createTime(6), endTime: createTime(6, 30), category: 'news', isLive: true },
  { id: 'dw_p2', channelId: '2', title: 'Made in Germany', startTime: createTime(6, 30), endTime: createTime(7), category: 'documentary' },
  { id: 'dw_p3', channelId: '2', title: 'DW News', startTime: createTime(7), endTime: createTime(7, 30), category: 'news', isLive: true },
  { id: 'dw_p4', channelId: '2', title: 'Arts 21', startTime: createTime(7, 30), endTime: createTime(8), category: 'entertainment' },
  { id: 'dw_p5', channelId: '2', title: 'DW News', startTime: createTime(12), endTime: createTime(12, 30), category: 'news', isLive: true },
  { id: 'dw_p6', channelId: '2', title: 'DocFilm', startTime: createTime(12, 30), endTime: createTime(13, 30), category: 'documentary' },
  { id: 'dw_p7', channelId: '2', title: 'DW News', startTime: createTime(18), endTime: createTime(18, 30), category: 'news', isLive: true },
  { id: 'dw_p8', channelId: '2', title: 'Global 3000', startTime: createTime(18, 30), endTime: createTime(19), category: 'documentary' },

  // Movie channels - Pluto TV Action
  { id: 'mov_p1', channelId: 'mov2', title: 'Action Movie Marathon', startTime: createTime(0), endTime: createTime(2), category: 'movies' },
  { id: 'mov_p2', channelId: 'mov2', title: 'Die Hard', startTime: createTime(8), endTime: createTime(10, 30), category: 'movies' },
  { id: 'mov_p3', channelId: 'mov2', title: 'Terminator 2', startTime: createTime(10, 30), endTime: createTime(13), category: 'movies' },
  { id: 'mov_p4', channelId: 'mov2', title: 'Mad Max', startTime: createTime(13), endTime: createTime(15), category: 'movies' },
  { id: 'mov_p5', channelId: 'mov2', title: 'Fast & Furious', startTime: createTime(15), endTime: createTime(17), category: 'movies' },
  { id: 'mov_p6', channelId: 'mov2', title: 'John Wick', startTime: createTime(19), endTime: createTime(21), category: 'movies' },
  { id: 'mov_p7', channelId: 'mov2', title: 'The Expendables', startTime: createTime(21), endTime: createTime(23), category: 'movies' },

  // NASA TV
  { id: 'nasa_p1', channelId: '11', title: 'NASA Live', startTime: createTime(0), endTime: createTime(24), category: 'documentary', isLive: true, description: 'Live coverage from NASA missions and events' },

  // Kids channels
  { id: 'kids_p1', channelId: 'ru10', title: 'Смешарики', startTime: createTime(6), endTime: createTime(7), category: 'kids' },
  { id: 'kids_p2', channelId: 'ru10', title: 'Маша и Медведь', startTime: createTime(7), endTime: createTime(8), category: 'kids' },
  { id: 'kids_p3', channelId: 'ru10', title: 'Фиксики', startTime: createTime(8), endTime: createTime(9), category: 'kids' },
  { id: 'kids_p4', channelId: 'ru10', title: 'Три кота', startTime: createTime(9), endTime: createTime(10), category: 'kids' },
  { id: 'kids_p5', channelId: 'ru10', title: 'Барбоскины', startTime: createTime(10), endTime: createTime(11), category: 'kids' },
  { id: 'kids_p6', channelId: 'ru10', title: 'Лунтик', startTime: createTime(11), endTime: createTime(12), category: 'kids' },
  { id: 'kids_p7', channelId: 'ru10', title: 'Ну, погоди!', startTime: createTime(18), endTime: createTime(19), category: 'kids' },
  { id: 'kids_p8', channelId: 'ru10', title: 'Спокойной ночи, малыши!', startTime: createTime(20, 50), endTime: createTime(21), category: 'kids' },
];

export function getProgramsForChannel(channelId: string): TVProgram[] {
  return samplePrograms.filter(p => p.channelId === channelId);
}

export function getCurrentProgram(channelId: string): TVProgram | undefined {
  const now = new Date();
  return samplePrograms.find(
    p => p.channelId === channelId && p.startTime <= now && p.endTime > now
  );
}

export function getUpcomingPrograms(channelId: string, limit: number = 5): TVProgram[] {
  const now = new Date();
  return samplePrograms
    .filter(p => p.channelId === channelId && p.startTime > now)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    .slice(0, limit);
}
