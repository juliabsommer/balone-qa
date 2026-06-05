import { faker } from '@faker-js/faker/locale/pt_BR';

export function randomUser() {
  const firstName = faker.person.firstName();
  const lastName  = faker.person.lastName();
  return {
    firstName,
    lastName,
    fullName:  `${firstName} ${lastName}`,
    email:     faker.internet.email({ firstName, lastName }).toLowerCase(),
    password:  faker.internet.password({ length: 12, memorable: false }) + 'A1!',
    phone:     faker.phone.number({ style: 'national' }),
    cpf:       faker.string.numeric(11),
  };
}

export function randomAddress() {
  return {
    street:       faker.location.street(),
    number:       faker.location.buildingNumber(),
    complement:   faker.helpers.maybe(() => faker.location.secondaryAddress(), { probability: 0.4 }) ?? '',
    neighborhood: faker.location.county(),
    city:         faker.location.city(),
    state:        faker.location.state({ abbreviated: true }),
    zipCode:      faker.location.zipCode('#####-###'),
  };
}

export function randomCard() {
  return {
    number:   '4111111111111111', // Visa de teste
    name:     faker.person.fullName().toUpperCase(),
    expiry:   '12/28',
    cvv:      '123',
  };
}

export { faker };
