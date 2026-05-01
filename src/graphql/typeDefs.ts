export const typeDefs = `#graphql
  type CrewMember {
    id: ID!
    email: String!
    name: String!
    role: String!
  }

  type Equipment {
    id: ID!
    sku: String!
    name: String!
    category: String!
    is_available: Boolean!
  }

  type Reservation {
    id: ID!
    checkout_date: String!
    return_date: String!
    event_venue: String!
    status: String!
    crew_id: ID!
    crew_member: CrewMember
    equipment: [Equipment!]!
  }

  type Query {
    crewMembers(limit: Int, offset: Int): [CrewMember!]!
    crewMember(id: ID!): CrewMember
    equipment(limit: Int, offset: Int): [Equipment!]!
    equipmentItem(id: ID!): Equipment
    reservations(limit: Int, offset: Int): [Reservation!]!
    reservation(id: ID!): Reservation
  }

  type Mutation {
    createCrewMember(email: String!, name: String!, role: String!): CrewMember!
    updateCrewMember(id: ID!, name: String, role: String): CrewMember!
    deleteCrewMember(id: ID!): Boolean!
    
    createEquipment(sku: String!, name: String!, category: String!): Equipment!
    updateEquipment(id: ID!, name: String, category: String, is_available: Boolean): Equipment!
    deleteEquipment(id: ID!): Boolean!

    createReservation(
      checkout_date: String
      return_date: String!
      event_venue: String!
      status: String!
      crew_id: ID!
      equipment_ids: [ID!]!
    ): Reservation!
    updateReservationStatus(id: ID!, status: String!): Reservation!
    cancelReservation(id: ID!): Boolean!
  }
`;
