export function addWorkingDays(startIso: string, workingDays: number): string {
  const date = new Date(startIso);
  let added = 0;
  while (added < workingDays) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  return date.toISOString();
}

export const defaultSla = {
  grmAcknowledgementWorkingDays: 2,
  grmScreeningWorkingDays: 3,
  localFirstActionWorkingDays: 10,
  appealWindowWorkingDays: 15,
  higherLevelResolutionWorkingDays: 30,
  seriousIncidentNotificationHours: 48,
};
