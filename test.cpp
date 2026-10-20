
#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int t;
    cin >> t;

    while (t--) {
        string s;
        cin >> s;

        bool increase = false;
        bool decrease = false;

        for (int i = 1; i + 1 < (int)s.size(); i++) {
            if (s[i - 1] == s[i] && s[i] == s[i + 1]) {
                increase = true;
            }

            if (s[i - 1] == s[i + 1] && s[i] != s[i - 1]) {
                decrease = true;
            }
        }

        cout << 1 + increase + decrease << '\n';
    }

    return 0;
}
