export async function checkUserAlreadyRated(redis, selfPostId, entryIndex, userTarget) {
  let gradeAmount = await redis.get(`${selfPostId}-entry${entryIndex}-grades`);
  gradeAmount = Number(gradeAmount) - 1;
  let userAlreadyRated
  for (let i = 0; i <= gradeAmount; i++) {
    let currentAuthor = await redis.get(`${selfPostId}-entry${entryIndex}-grade${i}-author`);
    if (currentAuthor === userTarget) {
      userAlreadyRated = true;
      return;
    }
    userAlreadyRated = false;
  }
  return userAlreadyRated;
}
