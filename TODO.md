# API URL Fix - Local Development

## Plan Progress
- [x] 1. Create `MainPlatform/frontend/.env` with `VITE_API_URL=http://localhost:8000`
- [x] 2. Edit `MainPlatform/frontend/src/services/olympiadService.js` - force localhost in DEV mode
- [x] 3. Verify changes
- [ ] 4. Test olympiad creation (Network tab: localhost:8000 calls)
- [ ] 5. User: restart `npm run dev` and hard refresh (Ctrl+Shift+R)

**✅ Files updated successfully!**

**Next:** 
1. Run `cd MainPlatform/frontend && npm run dev` (restart dev server for .env)
2. Open Olympiads page, try "Yangi olimpiada" → check Network tab (F12)
3. Calls should now go to `localhost:8000/api/v1/olympiads`

**Next step:** Create .env file
