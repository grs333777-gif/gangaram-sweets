#include<iostream>
#include<vector>
#include<unordered_set>
#include<stack>

using namespace std;

void findAns(pair<int,string>&inp, int& k, vector<int>& v){
    stack<int> st;
    unordered_set<int> printed;
    for(int i = 0; i<inp.first; i++){
        if(inp.second[i] == '1'){
            st.push(i+1);
        }
        else if(inp.second[i] == '2'){
            if(!st.empty()){
                printed.insert(st.top());
                st.pop();
            }
            else{
                printed.insert(i+1);
            }
        }
        else{
            printed.insert(i+1);
        }
    }
    k = inp.first - printed.size();
    for(int i = 1; i<=inp.first; i++){
        if(printed.find(i) == printed.end()){
            v.push_back(i);
        }
    }
}

int main(){
    int n;
    cin >> n;
    vector<pair<int,string>> inp;
    for(int i = 0; i<n; i++){
        int x;
        string y;
        cin >> x>> y;
        inp.push_back({x,y});
    }
    int first = 1;

    for(auto it: inp){
        int k = 0;
        vector<int> v;
        findAns(it, k, v);
        if(first == 1){
            first = 0;
        }
        else{
            cout << endl;
        }
        cout << k << endl;
        if(k == 0){
            cout << endl;
            continue;
        }
        for(auto c : v){
            cout << c << " ";
        }
    }
    


    return 0;
}