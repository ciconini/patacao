# Firebase Emulator Setup

## Prerequisites

The Firebase Emulator Suite requires Java to run. If you see an error about Java not being found, follow these steps:

## Installing Java (macOS)

### Option 1: Using Homebrew (Recommended)

1. **Install OpenJDK 21:**
   ```bash
   brew install openjdk@21
   ```

2. **Add Java to your PATH:**
   
   Add this line to your `~/.zshrc` (or `~/.bashrc` if using bash):
   ```bash
   export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"
   ```
   
   **Note:** Firebase tools requires Java 21 or above.

3. **Reload your shell:**
   ```bash
   source ~/.zshrc
   ```

4. **Verify installation:**
   ```bash
   java -version
   ```

   You should see output like:
   ```
   openjdk version "21.0.x"
   ```

### Option 2: System-wide Installation (Alternative)

If you want Java to be available system-wide:

```bash
sudo ln -sfn /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-21.jdk
```

## Starting the Emulator

Once Java is installed and in your PATH:

```bash
npm run firebase:emulators
```

The emulator will start on:
- **Firestore**: `http://localhost:8080`
- **Emulator UI**: `http://localhost:4000`

## Troubleshooting

### Error: "Unable to locate a Java Runtime"

**Solution**: Make sure Java is in your PATH. Check with:
```bash
which java
java -version
```

If it's not found, add it to your PATH as shown above.

### Error: "Port already in use"

**Solution**: Another process is using the emulator ports. Either:
1. Stop the other process
2. Change the ports in `firebase.json`

### Emulator UI not accessible

**Solution**: 
1. Check that the emulator is running
2. Visit `http://localhost:4000` in your browser
3. Check firewall settings if needed

## Running Tests with Emulator

1. **Start the emulator** (in one terminal):
   ```bash
   npm run firebase:emulators
   ```

2. **Run tests** (in another terminal):
   ```bash
   npm run test:firestore:rules
   ```

## Environment Variables

For local development with the emulator, set:
```bash
export USE_FIREBASE_EMULATOR=true
export FIREBASE_EMULATOR_HOST=localhost:8080
```

Or add to your `.env` file:
```
USE_FIREBASE_EMULATOR=true
FIREBASE_EMULATOR_HOST=localhost:8080
```

