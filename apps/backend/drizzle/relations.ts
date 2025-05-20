import { relations } from "drizzle-orm/relations";
import { ssoProvidersInAuth, samlRelayStatesInAuth, flowStateInAuth, sessionsInAuth, refreshTokensInAuth, usersInAuth, ssoDomainsInAuth, mfaAmrClaimsInAuth, samlProvidersInAuth, identitiesInAuth, oneTimeTokensInAuth, mfaFactorsInAuth, mfaChallengesInAuth, userProfiles, dashboardConfigs, friendRequests, tasks } from "./schema";

export const samlRelayStatesInAuthRelations = relations(samlRelayStatesInAuth, ({one}) => ({
	ssoProvidersInAuth: one(ssoProvidersInAuth, {
		fields: [samlRelayStatesInAuth.ssoProviderId],
		references: [ssoProvidersInAuth.id]
	}),
	flowStateInAuth: one(flowStateInAuth, {
		fields: [samlRelayStatesInAuth.flowStateId],
		references: [flowStateInAuth.id]
	}),
}));

export const ssoProvidersInAuthRelations = relations(ssoProvidersInAuth, ({many}) => ({
	samlRelayStatesInAuths: many(samlRelayStatesInAuth),
	ssoDomainsInAuths: many(ssoDomainsInAuth),
	samlProvidersInAuths: many(samlProvidersInAuth),
}));

export const flowStateInAuthRelations = relations(flowStateInAuth, ({many}) => ({
	samlRelayStatesInAuths: many(samlRelayStatesInAuth),
}));

export const refreshTokensInAuthRelations = relations(refreshTokensInAuth, ({one}) => ({
	sessionsInAuth: one(sessionsInAuth, {
		fields: [refreshTokensInAuth.sessionId],
		references: [sessionsInAuth.id]
	}),
}));

export const sessionsInAuthRelations = relations(sessionsInAuth, ({one, many}) => ({
	refreshTokensInAuths: many(refreshTokensInAuth),
	usersInAuth: one(usersInAuth, {
		fields: [sessionsInAuth.userId],
		references: [usersInAuth.id]
	}),
	mfaAmrClaimsInAuths: many(mfaAmrClaimsInAuth),
}));

export const usersInAuthRelations = relations(usersInAuth, ({many}) => ({
	sessionsInAuths: many(sessionsInAuth),
	identitiesInAuths: many(identitiesInAuth),
	oneTimeTokensInAuths: many(oneTimeTokensInAuth),
	mfaFactorsInAuths: many(mfaFactorsInAuth),
	userProfiles: many(userProfiles),
}));

export const ssoDomainsInAuthRelations = relations(ssoDomainsInAuth, ({one}) => ({
	ssoProvidersInAuth: one(ssoProvidersInAuth, {
		fields: [ssoDomainsInAuth.ssoProviderId],
		references: [ssoProvidersInAuth.id]
	}),
}));

export const mfaAmrClaimsInAuthRelations = relations(mfaAmrClaimsInAuth, ({one}) => ({
	sessionsInAuth: one(sessionsInAuth, {
		fields: [mfaAmrClaimsInAuth.sessionId],
		references: [sessionsInAuth.id]
	}),
}));

export const samlProvidersInAuthRelations = relations(samlProvidersInAuth, ({one}) => ({
	ssoProvidersInAuth: one(ssoProvidersInAuth, {
		fields: [samlProvidersInAuth.ssoProviderId],
		references: [ssoProvidersInAuth.id]
	}),
}));

export const identitiesInAuthRelations = relations(identitiesInAuth, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [identitiesInAuth.userId],
		references: [usersInAuth.id]
	}),
}));

export const oneTimeTokensInAuthRelations = relations(oneTimeTokensInAuth, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [oneTimeTokensInAuth.userId],
		references: [usersInAuth.id]
	}),
}));

export const mfaFactorsInAuthRelations = relations(mfaFactorsInAuth, ({one, many}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [mfaFactorsInAuth.userId],
		references: [usersInAuth.id]
	}),
	mfaChallengesInAuths: many(mfaChallengesInAuth),
}));

export const mfaChallengesInAuthRelations = relations(mfaChallengesInAuth, ({one}) => ({
	mfaFactorsInAuth: one(mfaFactorsInAuth, {
		fields: [mfaChallengesInAuth.factorId],
		references: [mfaFactorsInAuth.id]
	}),
}));

export const dashboardConfigsRelations = relations(dashboardConfigs, ({one}) => ({
	userProfile: one(userProfiles, {
		fields: [dashboardConfigs.userId],
		references: [userProfiles.userId]
	}),
}));

export const userProfilesRelations = relations(userProfiles, ({one, many}) => ({
	dashboardConfigs: many(dashboardConfigs),
	friendRequests_recipientId: many(friendRequests, {
		relationName: "friendRequests_recipientId_userProfiles_userId"
	}),
	friendRequests_requesterId: many(friendRequests, {
		relationName: "friendRequests_requesterId_userProfiles_userId"
	}),
	tasks: many(tasks),
	usersInAuth: one(usersInAuth, {
		fields: [userProfiles.userId],
		references: [usersInAuth.id]
	}),
}));

export const friendRequestsRelations = relations(friendRequests, ({one}) => ({
	userProfile_recipientId: one(userProfiles, {
		fields: [friendRequests.recipientId],
		references: [userProfiles.userId],
		relationName: "friendRequests_recipientId_userProfiles_userId"
	}),
	userProfile_requesterId: one(userProfiles, {
		fields: [friendRequests.requesterId],
		references: [userProfiles.userId],
		relationName: "friendRequests_requesterId_userProfiles_userId"
	}),
}));

export const tasksRelations = relations(tasks, ({one}) => ({
	userProfile: one(userProfiles, {
		fields: [tasks.userId],
		references: [userProfiles.userId]
	}),
}));