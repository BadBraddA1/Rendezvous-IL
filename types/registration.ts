export type ArrivalDeparturePlan = {
  /** When false, family follows standard Mon-before-5:15 / Fri-after-lunch schedule. */
  nonStandard: boolean
  arrival: string
  departure: string
  /** Family member ids this schedule applies to (non-standard only). */
  memberIds: string[]
  notes: string
}

export type LodgingType = "motel-2queen-bunk" | "motel-1queen-2bunk" | "rv" | "tent"

export type FamilyMember = {
  id: string
  firstName: string
  lastName?: string
  useCustomLastName?: boolean
  dateOfBirth: string
  age: number
  isBaptized: boolean
  personCost: number
  isOver18?: boolean
  gender?: "male" | "female" | null
  parentRole?: "father" | "mother" | null
  /** Required for father/mother, optional for everyone else. */
  email?: string
  phone?: string
}

export type TshirtOrder = {
  id: string
  size: string
  quantity: number
}

export type HealthInfo = {
  id: string
  fullName: string
  condition: string
  medicationOnHand: boolean
}

export type VolunteerSignup = {
  type: string
  names: string[]
}

export type RegistrationData = {
  familyLastName: string
  email: string
  husbandPhone: string
  wifePhone: string
  address: string
  city: string
  state: string
  zip: string
  homeCongregation: string
  fatherOccupation: string
  timesAttended: number
  yearsHomeschooling: number
  currentlyHomeschooling: boolean
  arrivalDeparture: ArrivalDeparturePlan
  familyMembers: FamilyMember[]
  lodgingType: LodgingType
  lodgingTotal: number
  tshirtOrders: TshirtOrder[]
  tshirtTotal: number
  climbingTowerParticipants: number
  climbingTowerTotal: number
  scholarshipDonation: number
  scholarshipRequested: boolean
  emergencyContactName: string
  emergencyContactRelationship: string
  emergencyContactPhone: string
  healthInfo: HealthInfo[]
  volunteerSignups: VolunteerSignup[]
  sessionSuggestions: {
    moms: string
    dads: string
  }
  fatherSignature: string
  motherSignature: string
  registrationFee: number
}
