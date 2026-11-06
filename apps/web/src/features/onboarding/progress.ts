export interface OnboardingProgress {
  hasWorkspace: boolean
  hasProject: boolean
  hasTask: boolean
  /** Where the third step leads: the first project, once there is one. */
  firstProjectPath: string | null
}

/** True while any of the three first-week steps is still open. */
export function isOnboarding(progress: OnboardingProgress): boolean {
  return !(progress.hasWorkspace && progress.hasProject && progress.hasTask)
}
