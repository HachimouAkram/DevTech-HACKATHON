import React, { Component, ErrorInfo, ReactNode } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle, RotateCcw } from 'lucide-react-native';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="dark-content" />
          <View style={styles.card}>
            <View style={styles.iconContainer}>
              <AlertTriangle size={48} color="#ef4444" />
            </View>
            
            <Text style={styles.title}>Oups ! Une erreur est survenue</Text>
            
            <Text style={styles.subtitle}>
              {this.props.fallbackTitle || "L'application a rencontré un problème inattendu lors de l'affichage de cet écran."}
            </Text>

            {this.state.error && (
              <View style={styles.detailsBox}>
                <Text style={styles.detailsTitle}>Détails techniques :</Text>
                <ScrollViewHorizontal>
                  <Text style={styles.errorText}>{this.state.error.message}</Text>
                </ScrollViewHorizontal>
              </View>
            )}

            <TouchableOpacity
              style={styles.button}
              onPress={this.handleReset}
              activeOpacity={0.8}
            >
              <RotateCcw size={18} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Recharger la page</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

// Simple internal helper for horizontal scrolling of error messages
const ScrollViewHorizontal = ({ children }: { children: React.ReactNode }) => {
  return (
    <View style={{ maxHeight: 60, width: '100%', overflow: 'hidden' }}>
      <Text numberOfLines={3} style={styles.errorText}>
        {children}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc', // Slate 50
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  detailsBox: {
    width: '100%',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  detailsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  errorText: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#334155',
    lineHeight: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb', // SenInnov Royal Blue
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    width: '100%',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
