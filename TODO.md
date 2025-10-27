# NFT Ticketing on Algorand - Robust Client Implementation

## Plan Overview
- Improve NftBookingsClient with retry logic, transaction queue, and better error handling
- Create MockNftBookingsClient for development mode
- Update config.ts for environment-based app ID and dev mode
- Update components to use improved client and handle errors gracefully

## Tasks
- [x] Create TODO.md file
- [x] Improve NftBookingsClient in NftBookings.tsx:
  - Add retry logic for read-only calls
  - Implement transaction queue to prevent concurrent wallet transactions
  - Add better error handling with specific error types
  - Add exponential backoff for retries
- [x] Create MockNftBookingsClient in NftBookings.tsx
- [x] Update config.ts to support environment-based app ID and dev mode flag
- [x] Update EventList.tsx to use improved client and handle errors
- [x] Update BuyTicketModal.tsx to use improved client and handle errors
- [x] Update other components if needed (TicketList.tsx, CreateEventModal.tsx)
- [x] Test in development mode with mocks (resolved mock network timeout by reducing error frequency)
- [ ] Deploy contract to get real app ID
- [ ] Update config with deployed app ID for production
