/** Text (or a list, or sections) in both languages. */
export type Localized<T = string> = { en: T; es: T }

export type RideType = 'one_way' | 'return' | 'local' | 'hourly' | 'city_to_city' | 'airport'
