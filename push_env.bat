@echo off
echo Pushing environment variables to Vercel...

echo mongodb+srv://kulalpavan338_db_user:oUSLHyUj6iTJ7v8P@cluster0.dsgxzku.mongodb.net/forgetrack?retryWrites=true^&w=majority^&appName=Cluster0 | vercel env add MONGO_URI production
echo your_jwt_secret_here | vercel env add JWT_SECRET production
echo AIzaSyB7B7TewcK7Sfav-DhFgtY1v87a31T4Jls | vercel env add GEMINI_API_KEY production
echo production | vercel env add NODE_ENV production

echo Done! All environment variables pushed to Vercel.
