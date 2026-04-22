export const storageService = {
  getAccessToken: () => sessionStorage.getItem('accessToken'),
  getRefreshToken: () => sessionStorage.getItem('refreshToken'),
  getUser: () => {
    const user = sessionStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
  saveAccessToken: (token: string) => sessionStorage.setItem('accessToken', token),
  saveRefreshToken: (token: string) => sessionStorage.setItem('refreshToken', token),
  saveUser: (user: any) => sessionStorage.setItem('user', JSON.stringify(user)),
  clearTokens: () => {
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('user');
  },
};
